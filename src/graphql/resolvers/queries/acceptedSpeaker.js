export const fieldResolvers = {
  AcceptedSpeaker: {
    member: ({ id }) => ({ id }),
    order: ({ orderId: id }) => (id ? { id } : null),
  },
};
