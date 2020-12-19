import debug from 'debug';

import productStore from '../../../dataSources/cloudFirestore/product';

const dlog = debug('that:api:event:mutation:eventProduct');

export const fieldResolvers = {
  EventProductMutation: {
    add: ({ eventId, productId }, __, { dataSources: { firestore }, user }) => {
      dlog('add eventProduct called');
      return productStore(firestore).addEvent({
        eventId,
        productId,
        userId: user.sub,
      });
    },
    update: (
      { eventId, productId },
      __,
      { dataSources: { firestore }, user },
    ) => {
      dlog('update eventProduct called');
      return productStore(firestore).updateEvent({
        eventId,
        productId,
        userId: user.sub,
      });
    },
    remove: (
      { eventId, productId },
      __,
      { dataSources: { firestore }, user },
    ) => {
      dlog('remove eventProduct called');
      return productStore(firestore).removeEvent({
        eventId,
        productId,
        userId: user.sub,
      });
    },
  },
};
