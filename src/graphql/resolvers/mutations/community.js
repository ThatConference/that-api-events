import debug from 'debug';
import * as Sentry from '@sentry/node';
import { lib } from '@thatconference/api';
import dateformat from 'dateformat';
import envConfig from '../../../envConfig';
import communityStore from '../../../dataSources/cloudFirestore/community';
import eventStore from '../../../dataSources/cloudFirestore/event';
import sessionStore from '../../../dataSources/cloudFirestore/session';
import slackDigest from '../../../lib/slack/slackDigest';

const dlog = debug('that:api:community:mutation');

export const fieldResolvers = {
  CommunityMutation: {
    update: (
      { communityId },
      { community },
      { dataSources: { firestore }, user },
    ) => {
      dlog('update community');
      return communityStore(firestore).update({
        communityId,
        modifiedCommunity: community,
        user,
      });
    },

    changeSlug: (
      { communityId },
      { newSlug },
      { dataSources: { firestore }, user },
    ) => {
      dlog('changeSlug called');
      return communityStore(firestore).changeSlug({
        communityId,
        newSlug,
        user,
      });
    },
    sendDigest: async (
      { slug },
      { hours, start },
      { dataSources: { firestore } },
    ) => {
      dlog('sendDialog called for %s, hours: %s', slug, hours);
      if (hours < 1) throw new Error('hours minimum value is 1');
      if (hours > 168) throw new Error('hours maximum value is 168');
      const activeEvents = await eventStore(
        firestore,
      ).findActiveByCommunitySlug(slug);
      let digestStart = 'CURRENT_HOUR';
      if (start) digestStart = start;

      let atDate;
      // Date as of now min, sec, ms set to zero
      if (digestStart === 'CURRENT_HOUR') {
        atDate = new Date(new Date().setMinutes(0, 0, 0));
      } else if (digestStart === 'NEXT_HOUR') {
        // now + 1 hour (3600000 ms)
        atDate = new Date(new Date().setMinutes(0, 0, 0) + 3600000);
      } else {
        throw new Error(`Unknown value sent for 'start': ${digestStart}`);
      }
      const hoursAfter = hours || 1;
      const sessionFuncs = activeEvents.map(ev =>
        sessionStore(firestore).findAllApprovedActiveByEventIdAtDateHours(
          ev.id,
          atDate,
          hoursAfter,
        ),
      );
      const sessionRefs = await Promise.all(sessionFuncs);
      const sessions = [];
      sessionRefs.forEach(s => sessions.push(...s));
      let result = [];
      if (sessions.length > 0) {
        slackDigest({ sessions, hours: hoursAfter, events: activeEvents });

        result = sessions.map(s => ({ id: s.id }));
      }
      return result;
    },
    queueUpSocials: async (
      { slug },
      { socials, startHoursAhead = 2 },
      { dataSources: { firestore } },
    ) => {
      dlog('queueUpSocials called with socials: %o', socials);
      const socialsBuffer = lib.socialsBuffer.socialsBuffer();
      const socialsEnum = lib.socialsBuffer.socials;
      Sentry.configureScope(scope =>
        scope.setContext('socials passed in', { socials: socials.join() }),
      );

      // validate socials are valid in library
      const socialsArray = socials.map(s => socialsEnum[s]);
      const ee = socialsArray.indexOf(undefined);
      if (ee >= 0) {
        const missingSocialError = new Error(
          `passed in social profile unknown by library: ${socials[ee]}`,
        );
        Sentry.setContext('library social profiles', { socialsEnum });
        Sentry.captureException(missingSocialError);
        throw missingSocialError;
      }
      const activeEvents = await eventStore(
        firestore,
      ).findActiveByCommunitySlug(slug);
      // floor of now + 1 hr * startHoursAhead
      const activityHour = new Date(
        new Date().setMinutes(0, 0, 0) + 3600000 * startHoursAhead,
      );
      const findSessionFuncs = activeEvents.map(ev =>
        sessionStore(firestore).findAllApprovedActiveByEventIdAtDateHours(
          ev.id,
          activityHour,
          1,
        ),
      );
      const sessionRefs = await Promise.all(findSessionFuncs);
      const foundSessions = [];
      sessionRefs.forEach(s => foundSessions.push(...s));
      if (foundSessions.length > 0) {
        // We are not checking if activity already queued.
        const pretext = 'Coming up on THAT.us!';
        const sessBaseUrl = 'https://that.us/activities';

        const queueBufferFuncs = foundSessions.map(_session => {
          const link = `${sessBaseUrl}/${_session.id}`;
          const startTime = new Date(_session.startTime);
          // now + 1 to 5 minutes
          const scheduleAtMs =
            new Date().getTime() + Math.floor(Math.random() * 5 + 1) * 60000;
          let addMonth = 0;
          if (envConfig.queueUpSocialsAddMonth === true) {
            addMonth = 2628000000; // 1 month in ms
          }
          dlog('add month value: %d', addMonth);
          const scheduleAt = new Date(scheduleAtMs + addMonth);
          const postText = `${pretext}

${_session.title}
Starting at: ${dateformat(startTime, 'dddd, mmmm dS, yyyy "@" h:MM TT Z')} 
`;

          return socialsBuffer.createPost({
            postText,
            socialsArray,
            link,
            scheduleAt,
          });
        });

        dlog('queueBufferFuncs count %d', queueBufferFuncs.length);
        const rr = await Promise.all(queueBufferFuncs);
        dlog('Result from buffer funcs: %o', rr);
        // check and report any failed posts
        // each returned Promise
        rr.forEach(pd => {
          if (!pd.isOk) {
            Sentry.setContext('failed socialsBuffer request', {
              data: pd.data,
            });
            Sentry.setContext('status', {
              status: pd.status,
              statusText: pd.statusText,
            });
            Sentry.captureMessage(
              `non-200 result from socialBuffer library. status: ${pd.status}, ${pd.statusText}`,
              'warning',
            );
          }
        });
      }
      return foundSessions.length;
    },
  },
};
