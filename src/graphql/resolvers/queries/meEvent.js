import debug from 'debug';
import checkMemberEventAccess from '../../../lib/checkMemberEventAccess';

const dlog = debug('that:api:events:me:query');

export const fieldResolvers = {
  MeEventQuery: {
    favorites: () => {
      dlog('meEventQuery called');
      return {};
    },
    hasAccess: (_, { eventId }, { dataSources: { firestore }, user }) => {
      dlog('user %s have access to Event %s?', user.sub, eventId);
      return checkMemberEventAccess({ memberId: user.sub, eventId, firestore });
    },
  },
};
