import venueStore from '../../../dataSources/cloudFirestore/venue';

export const fieldResolvers = {
  VenueMutation: {
    update: async ({ venueId }, { venue }, { dataSources: { firestore } }) =>
      venueStore(firestore).update(venueId, venue),
    rooms: ({ venueId }) => ({ venueId }),
  },
};
