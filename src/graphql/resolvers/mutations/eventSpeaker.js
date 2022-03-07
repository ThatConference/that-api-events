import { dataSources } from '@thatconference/api';
import orderStore from '../../../dataSources/cloudFirestore/order';

const eventSpeakerStore = dataSources.cloudFirestore.eventSpeaker;

export const fieldResolvers = {
  EventSpeakerMutation: {
    acceptToSpeak: (
      { eventId },
      { agreeToSpeak, reason },
      { dataSources: { firestore }, user },
    ) =>
      eventSpeakerStore(firestore).setAcceptToSpeak({
        eventId,
        memberId: user.sub,
        isAccepting: agreeToSpeak,
        reason,
      }),

    acceptRoomBenefit: (
      { eventId },
      { accept },
      { dataSources: { firestore }, user },
    ) =>
      eventSpeakerStore(firestore).setAcceptRoomBenefit({
        eventId,
        memberId: user.sub,
        acceptRoom: accept,
      }),

    completeEnrollment: async (
      { eventId },
      __,
      { dataSources: { firestore }, user },
    ) => {
      const eventSpeaker = await eventSpeakerStore(firestore).get({
        eventId,
        memberId: user.sub,
      });

      if (!eventSpeaker?.orderId)
        return {
          success: false,
          message: `No order on speaker enrollment record, cannot mark complete`,
        };

      return orderStore(firestore)
        .updateOrderAllocationsOnOrder({
          orderId: eventSpeaker.orderId,
          updateAllocation: {
            enrollmentStatus: 'COMPLETE',
          },
          userId: user.sub,
        })
        .then(result => {
          if (result !== true) {
            return {
              success: false,
              message: `Unable to update tickets while completing enrollment, please contact THAT Conference.`,
            };
          }

          return eventSpeakerStore(firestore).setEnrollmentComplete({
            eventId,
            memberId: user.sub,
          });
        });
    },
  },
};
