import debug from 'debug';
import checkMemberEventAccess from '../../../lib/checkMemberEventAccess';
import checkMemberCanMutate from '../../../lib/checkMemberCanMutate';

const dlog = debug('that:api:events:me:query');

export const fieldResolvers = {
  MeEventAccessQuery: {
    hasAccess: ({ eventId }, __, { dataSources: { firestore }, user }) => {
      dlog('user %s have access to Event %s?', user.sub, eventId);
      return checkMemberEventAccess({ user, eventId, firestore });
    },
    addSession: ({ eventId }, __, { dataSources: { firestore }, user }) => {
      dlog('user %s add session access to event %s', user.sub, eventId);
      return checkMemberCanMutate({ eventId, user, firestore });
    },
  },
};
