export const fieldResolvers = {
  EventDestinationsQuery: {
    destination: ({ eventId }, { name: destinationName }) => ({
      eventId,
      destinationName,
    }),
  },
};
