import debug from 'debug';
import { dataSources } from '@thatconference/api';

import communityStore from '../../../dataSources/cloudFirestore/community';
import eventStore from '../../../dataSources/cloudFirestore/event';
import sessionStore from '../../../dataSources/cloudFirestore/session';

const favoriteStore = dataSources.cloudFirestore.favorites;
const favoriteType = 'community';
const assetStore = dataSources.cloudFirestore.assets;
const entityType = 'COMMUNITY';
const dlog = debug('that:api:community:query');

export const fieldResolvers = {
  CommunityQuery: {
    get: ({ communityId }, __, { dataSources: { firestore } }) => {
      dlog('get called %s', communityId);

      if (!communityId) return null;

      return communityStore(firestore).get(communityId);
    },

    stats: async ({ slug }, __, { dataSources: { firestore } }) => {
      dlog('stats called %s', slug);
      if (!slug) return [];
      const today = new Date();
      const stats = await sessionStore(
        firestore,
      ).getSessionStatsByCommunitySlug({
        communitySlug: slug,
        date: today,
      });

      return {
        slug,
        totalActivities: stats.totalActivities,
        pastActivities: stats.pastActivities,
        upcomingActivities: stats.upcomingActivities,
        hoursServed: Math.floor(stats.pastDuration / 60),
        minutesServed: stats.pastDuration,
        upcomingMinutes: stats.upcomingDuration,
      };
    },
  },

  Community: {
    __resolveReference({ id }, { dataSources: { communityLoader } }) {
      dlog('resolve reference');
      return communityLoader.load(id);
    },
    createdBy: ({ createdBy }) => {
      dlog('createdBy');
      return {
        __typename: 'PublicProfile',
        id: createdBy,
      };
    },
    lastUpdatedBy: ({ lastUpdatedBy }) => {
      dlog('lastUpdatedBy');
      return {
        __typename: 'PublicProile',
        id: lastUpdatedBy,
      };
    },
    links: ({ links }) => links ?? [],
    events: ({ slug }, { filter }, { dataSources: { firestore } }) => {
      dlog('Community.events called with filter %s', filter);

      let eventResults;
      if (filter === 'ACTIVE') {
        eventResults = eventStore(firestore).findActiveByCommunitySlug(slug);
      } else if (filter === 'FEATURED') {
        eventResults = eventStore(firestore).findFeaturedByCommunitySlug(slug);
      } else if (filter === 'PAST') {
        eventResults = eventStore(firestore).findPastByCommunitySlug(slug);
      } else if (!filter || filter === 'ALL') {
        eventResults = eventStore(firestore).findAllByCommunitySlug(slug);
      } else {
        throw new Error(`fiter ${filter} not implemented yet.`);
      }

      return eventResults;
    },

    sessions: (
      { slug },
      {
        status = ['APPROVED'],
        filter = 'UPCOMING',
        orderBy,
        asOfDate,
        pageSize = 20,
        cursor,
      },
      { dataSources: { firestore } },
    ) => {
      dlog(
        'sessions called: community %s, page size %d, after %s, orderedBy %s, having statuses %o with filter %s',
        slug,
        pageSize,
        cursor,
        orderBy,
        status,
        filter,
      );

      // Get sessions by community slug
      return sessionStore(firestore).findByCommunityWithStatuses({
        communitySlug: slug,
        statuses: status,
        filter,
        asOfDate,
        orderBy,
        pageSize,
        cursor,
      });
    },

    sessionCount: ({ slug }, { filter }, { dataSources: { firestore } }) => {
      dlog('sessionCount called with filter %s', filter);
      let countFunc;

      if (filter === 'UPCOMING' || filter === 'PAST') {
        countFunc = sessionStore(firestore).getCountByCommunitySlugDate({
          communitySlug: slug,
          date: new Date(),
          direction: filter,
        });
      } else {
        countFunc = sessionStore(firestore).getCountByCommunitySlug({
          communitySlug: slug,
        });
      }

      return countFunc;
    },

    followCount: ({ id }, __, { dataSources: { firestore } }) => {
      dlog('followCount called');
      return favoriteStore(firestore).getFavoriteCount({
        favoritedId: id,
        favoriteType,
      });
    },

    followers: (
      { id },
      { pageSize, cursor },
      { dataSources: { firestore } },
    ) => {
      dlog('followers called');
      return favoriteStore(firestore).getFollowersPaged({
        favoritedId: id,
        favoriteType,
        pageSize,
        cursor,
      });
    },

    assets: ({ id: entityId }, __, { dataSources: { firestore } }) => {
      dlog('assets for community called');
      return assetStore(firestore).findEntityAssets({
        entityId,
        entityType,
      });
    },
    moderators: () => {},
  },
};
