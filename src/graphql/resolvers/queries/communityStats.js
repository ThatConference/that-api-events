import debug from 'debug';

import eventStore from '../../../dataSources/cloudFirestore/event';
import memberStore from '../../../dataSources/cloudFirestore/members';

const dlog = debug('that:api:community:communityStats');

export const fieldResolvers = {
  CommunityStats: {
    totalMembers: (_, __, { dataSources: { firestore } }) => {
      dlog('totalMembers called');
      return memberStore(firestore).getMemberTotal();
    },

    totalEvents: ({ slug }, __, { dataSources: { firestore } }) => {
      dlog('totalEvents called');
      return eventStore(firestore).getCountByCommunitySlug(slug);
    },
  },
};
