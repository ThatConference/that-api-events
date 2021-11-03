import { dataSources } from '@thatconference/api';

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

    completeEnrollment: (
      { eventId },
      __,
      { dataSources: { firestore }, user },
    ) =>
      eventSpeakerStore(firestore).setEnrollmentComplete({
        eventId,
        memberId: user.sub,
      }),
  },
};
