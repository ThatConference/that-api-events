import debug from 'debug';
import orderStore from '../../../dataSources/cloudFirestore/order';

const dlog = debug('that:api:events:query:registration');

export const fieldResolvers = {
  RegistrationQuery: {
    all: ({ eventId }, __, { dataSources: { firestore } }) => {
      dlog('all called for eventId: %s', eventId);
      return orderStore(firestore).findAllCompleteOrdersForEvent(eventId);
    },
  },
};
