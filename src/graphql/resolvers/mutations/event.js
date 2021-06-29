import eventStore from '../../../dataSources/cloudFirestore/event';

export const fieldResolvers = {
  EventMutation: {
    update: async ({ eventId }, { event }, { dataSources: { firestore } }) =>
      eventStore(firestore).update(eventId, event),
    notifications: ({ eventId }) => ({ eventId }),
    milestones: ({ eventId }) => ({ eventId }),
    partner: ({ eventId }, { id }) => ({ eventId, partnerId: id }),
    product: ({ eventId }, { productId }) => ({ eventId, productId }),
    registration: ({ eventId }) => ({ eventId }),
  },
};
