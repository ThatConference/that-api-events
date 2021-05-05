import debug from 'debug';

import venueRoomStore from '../../../dataSources/cloudFirestore/venueRoom';

const dlog = debug('that:api:events:query:venue');

export const fieldResolvers = {
  Venue: {
    rooms: ({ id: venueId }, __, { dataSources: { firestore } }) => {
      dlog('Venue: rooms called %s', venueId);
      return venueRoomStore(firestore).getAll(venueId);
    },
  },
};
