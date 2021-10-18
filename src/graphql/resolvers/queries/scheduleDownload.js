import debug from 'debug';
import { dataSources } from '@thatconference/api';
import { writeToString } from '@fast-csv/format';
import dateformat from 'dateformat';
import sessionStore from '../../../dataSources/cloudFirestore/session';

const memberStore = dataSources.cloudFirestore.member;
const dlog = debug('that:api:event:scheduleDownload');

const sortSchedule = (a, b) => {
  const aStart = a.startTime instanceof Date ? a.startTime.getTime() : 0;
  const bStart = b.startTime instanceof Date ? b.startTime.getTime() : 0;
  return aStart - bStart;
};

export const fieldResolvers = {
  ScheduleDownload: {
    csv: async ({ eventId }, __, { dataSources: { firestore } }) => {
      dlog('Schedule Download - CSV called on event %s', eventId);
      const rawSchedule = await sessionStore(
        firestore,
      ).findAllByEventIdWithStatuses(eventId, [
        'ACCEPTED',
        'CANCELLED',
        'SCHEDULED',
      ]);

      const rawIds = rawSchedule.map(s => s.speakers).flat();
      const setIds = new Set(rawIds); // dedups id's
      const speakerIds = [...setIds];
      const speakersRaw = await memberStore(firestore).batchFind(speakerIds);
      const speakers = speakersRaw.map(s => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        profileSlug: s.profileSlug,
      }));

      rawSchedule.sort(sortSchedule);
      const schedule = rawSchedule.map(r => {
        const isDate = r.startTime instanceof Date;
        const room = r.location?.destination || '';
        const speaker = r.speakers.map(spkrId => {
          const sp = speakers.find(sl => sl.id === spkrId) || '';
          return `${sp?.firstName || ''} ${sp?.lastName || ''}`;
        });

        return {
          id: r.id,
          startTime: r.startTime?.toISOString(),
          day: isDate ? dateformat(r.startTime, 'dddd') : '',
          slot: isDate ? dateformat(r.startTime, 'HH:mm') : '',
          room,
          speaker: speaker.join(';'),
          title: r.title,
          PriCategory: r.primaryCategory,
          targetLocation: r.targetLocation,
          sessionLink: `https://that.us/activities/${r.id}`,
          sessionType: r.type,
        };
      });
      const csvOptions = {
        headers: true,
        quoteColumns: true,
      };
      return writeToString(schedule, csvOptions);
    },
  },
};
