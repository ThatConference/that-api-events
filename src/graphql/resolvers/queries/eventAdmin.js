import debug from 'debug';

import eventStore from '../../../dataSources/cloudFirestore/event';

const dlog = debug('that:api:eventAdmin:query');

export const fieldResolvers = {
  EventAdminQuery: {
    acceptedSpeakers: (
      { eventId },
      { platform, status, agreedToSpeak },
      { dataSources: { firestore } },
    ) => {
      dlog('eventAdmin acceptedSpeakers resolver called');

      return eventStore(firestore).getAcceptedSpeakersForEvent({
        eventId,
        platform,
        status,
        agreedToSpeak,
      });
    },
  },
};
