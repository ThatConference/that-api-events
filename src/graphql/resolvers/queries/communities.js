import debug from 'debug';

import communityStore from '../../../dataSources/cloudFirestore/community';

const dlog = debug('that:api:comunities:query');

export const fieldResolvers = {
  CommunitiesQuery: {
    // Returns all communities in data store
    all: (_, __, { dataSources: { firestore } }) => {
      dlog('all called');

      return communityStore(firestore).getAllActive();
    },

    // return community with mathing id
    community: (_, { findBy }, { dataSources: { firestore } }) => {
      dlog('community top level called %s', findBy);
      if (!findBy.slug && !findBy.id)
        throw new Error(
          'community findBy requires an id or slug. Neither provided',
        );

      let result = null;
      if (findBy.slug && !findBy.id) {
        dlog('find community id by slug');
        return communityStore(firestore)
          .findIdFromSlug(findBy.slug)
          .then(d => {
            if (d) {
              result = {
                communityId: d.id,
                slug: findBy.slug,
              };
            }
            dlog('slug/id %o', result);
            return result;
          });
      }
      dlog('community by id');
      // id only or id and slug sent
      // get slug/verify slug-id relationship
      return communityStore(firestore)
        .getSlug(findBy.id)
        .then(c => {
          if (c) {
            if (findBy.slug && findBy.slug !== c.slug)
              throw new Error('Community slug and id provided do not match.');
            result = {
              communityId: c.id,
              slug: c.slug,
            };
          }
          dlog('slug/id result %o', result);
          return result;
        });
    },
  },
};
