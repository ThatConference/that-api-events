import debug from 'debug';
import sessionStore from '../../../dataSources/cloudFirestore/session';

const dlog = debug('that:api:events:me:query');

export const fieldResolvers = {
  EventAcceptedSpeaker: {
    sessions: (
      { eventId, memberId, isAcceptedSpeaker },
      __,
      { dataSources: { firestore } },
    ) => {
      dlog('Accepted speaker sessions called.');
      if (!isAcceptedSpeaker) return [];

      return sessionStore(firestore).findAcceptedByEventIdSpeaker({
        eventId,
        memberId,
      });
    },
  },
};
