import debug from 'debug';
import venueRoomStore from '../../../dataSources/cloudFirestore/venueRoom';

const dlog = debug('that:api:events:mutation:venueroom');

export const fieldResolvers = {
  VenueRoomMutation: {
    update: async (
      { venueId, roomId },
      { venueRoom },
      { dataSources: { firestore } },
    ) => {
      dlog(
        'update called venueId %s, roomId %s, venueRoom %o',
        venueId,
        roomId,
        venueRoom,
      );
      return venueRoomStore(firestore).update({
        venueId,
        roomId,
        upVenueRoom: venueRoom,
      });
    },
  },
};
