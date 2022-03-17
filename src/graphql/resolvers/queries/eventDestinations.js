import debug from 'debug';

const dlog = debug('that:api:eventAdmin:query');

export const fieldResolvers = {
  EventDestinationsQuery: {
    destination: ({ eventId }, { name: destinationName }) => ({
      eventId,
      destinationName,
    }),
  },
};
