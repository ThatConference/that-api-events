import { EventEmitter } from 'events';
import debug from 'debug';
import { dataSources } from '@thatconference/api';
import * as Sentry from '@sentry/node';
import envConfig from '../envConfig';
import { SendEmailError } from '../lib/errors';
import constants from '../constants';

const dlog = debug('that:api:sessions:events:user');
const memberStore = dataSources.cloudFirestore.member;

function userEvents(postmark) {
  const userEventEmitter = new EventEmitter();
  dlog('user event emitter created');

  async function getMemberInfo({ memberId, firestore, caller }) {
    dlog('fetching member info for %s', memberId);
    let member = null;
    try {
      member = await memberStore(firestore).get(memberId);
    } catch (err) {
      process.nextTick(() => userEventEmitter.emit('emailError', err));
    }

    if (!member?.email) {
      Sentry.withScope(scope => {
        scope.setLevel('warning');
        scope.setTags({
          event: 'user',
          caller,
          eventMemberId: memberId,
        });
        scope.setContext('member', member);
        Sentry.captureMessage(`Unable to send email, member not found`);
      });
      return undefined;
    }

    return member;
  }

  async function sendCheckinWelcomeEmail({
    memberId,
    firestore,
    partnerPin,
    eventSlug,
  }) {
    dlog('sendCheckinWelcomeEmail called for %s', memberId);
    // may be an unallocated ticket and doesn't have a memberId assigned
    if (!memberId) return undefined;
    const member = await getMemberInfo({
      memberId,
      firestore,
      caller: 'sendCheckinWelcomeEmail',
    });
    if (!member) return undefined;

    return postmark.sendEmailWithTemplate({
      templateAlias: 'welcome-registration-checkin',
      from: envConfig.notificationEmailFrom,
      to: member.email,
      templateModel: {
        member: {
          firstName: member.firstName,
          lastName: member.lastName,
          partnerPin,
        },
        event: {
          slug: eventSlug,
        },
      },
      tag: 'welcome_checkin',
    });
  }

  async function sendSpeakerEnrollmentCompleteEmail({
    memberId,
    agreeToSpeak,
    firestore,
  }) {
    dlog(
      'sendSpeakerEnrollmentCompleteEmail called for %s who agreeToSpeak $s',
      memberId,
      agreeToSpeak,
    );

    if (!memberId) return undefined;
    const member = await getMemberInfo({
      memberId,
      firestore,
      caller: 'sendSpeakerEnrollmentCompleteEmail',
    });
    if (!member) return undefined;

    let templateAlias = 'speaker-enroll-complete-agree-true';
    if (agreeToSpeak === false)
      templateAlias = 'speaker-enroll-complete-agree-false';

    return postmark.sendEmailWithTemplate({
      templateAlias,
      from: envConfig.notificationEmailFrom,
      to: member.email,
      templateModel: {
        member: {
          firstName: member.firstName,
          lastName: member.lastName,
        },
      },
      tag: 'speaker_enrollment_complete',
    });
  }

  userEventEmitter.on('emailError', err => {
    Sentry.setTag('section', 'userEventEmitter');
    Sentry.captureException(new SendEmailError(err.message));
  });

  userEventEmitter.on(
    constants.THAT.USER_EVENTS.REGISTRATION_CHECKIN,
    sendCheckinWelcomeEmail,
  );
  userEventEmitter.on(
    constants.THAT.USER_EVENTS.SPEAKER_ENROLLMENT_COMPLETE,
    sendSpeakerEnrollmentCompleteEmail,
  );

  return userEventEmitter;
}

export default userEvents;
