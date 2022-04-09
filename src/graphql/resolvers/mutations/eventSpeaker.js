import { dataSources } from '@thatconference/api';
import orderStore from '../../../dataSources/cloudFirestore/order';
import constants from '../../../constants';

const eventSpeakerStore = dataSources.cloudFirestore.eventSpeaker;

export const fieldResolvers = {
  EventSpeakerMutation: {
    acceptToSpeak: (
      { eventId },
      { agreeToSpeak, reason },
      {
        dataSources: {
          firestore,
          events: { userEvents },
        },
        user,
      },
    ) =>
      eventSpeakerStore(firestore)
        .setAcceptToSpeak({
          eventId,
          memberId: user.sub,
          isAccepting: agreeToSpeak,
          reason,
        })
        .then(result => {
          if (agreeToSpeak === false) {
            userEvents.emit(
              constants.THAT.USER_EVENTS.SPEAKER_ENROLLMENT_COMPLETE,
              {
                memberId: user.sub,
                agreeToSpeak,
                firestore,
              },
            );
          }

          return result;
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
      {
        dataSources: {
          firestore,
          events: { userEvents },
        },
        user,
      },
    ) => {
      const eventSpeaker = await eventSpeakerStore(firestore).get({
        eventId,
        memberId: user.sub,
      });

      if (!eventSpeaker?.orderId) {
        return {
          success: false,
          message: `No order on speaker enrollment record, cannot mark complete`,
        };
      }

      const orderResult = await orderStore(
        firestore,
      ).updateOrderAllocationsOnOrder({
        orderId: eventSpeaker.orderId,
        updateAllocation: {
          enrollmentStatus: 'COMPLETE',
        },
        userId: user.sub,
      });

      if (orderResult !== true) {
        return {
          success: false,
          message: `Unable to update tickets while completing enrollment, please contact THAT Conference.`,
        };
      }

      const result = await eventSpeakerStore(firestore).setEnrollmentComplete({
        eventId,
        memberId: user.sub,
      });

      userEvents.emit(constants.THAT.USER_EVENTS.SPEAKER_ENROLLMENT_COMPLETE, {
        memberId: user.sub,
        agreeToSpeak: true,
        firestore,
      });

      return result;
    },
  },
};
