import venueRoomStore from '../../../dataSources/cloudFirestore/venueRoom';

export const fieldResolvers = {
  VenueRoomsMutation: {
    create: async (
      { venueId },
      { venueRoom },
      { dataSources: { firestore } },
    ) => venueRoomStore(firestore).create(venueId, venueRoom),

    delete: () => {
      throw new Error('Not implemented yet.');
    },

    room: ({ venueId }, { roomId }) => ({ venueId, roomId }),
  },
};
