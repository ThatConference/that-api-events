import debug from 'debug';

import eventStore from '../../../dataSources/cloudFirestore/event';

const dlog = debug('that:api:eventAdmin:query');

export const fieldResolvers = {
  EventAdminQuery: {
    acceptedSpeakers: (
      { eventId },
      { filters },
      { dataSources: { firestore } },
    ) => {
      dlog('eventAdmin acceptedSpeakers resolver called');
      const {
        platform,
        statuses,
        agreedToSpeak,
        acceptedRoomBenefit,
        isSponsorSpeaker,
      } = filters;
      return eventStore(firestore).getAcceptedSpeakersForEvent({
        eventId,
        platform,
        statuses,
        agreedToSpeak,
        acceptedRoomBenefit,
        isSponsorSpeaker,
      });
    },
  },
};
