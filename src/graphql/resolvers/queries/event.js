import debug from 'debug';
import { dataSources } from '@thatconference/api';

import notificationResolver from './notification';
import venueStore from '../../../dataSources/cloudFirestore/venue';
import eventStore from '../../../dataSources/cloudFirestore/event';
import partnerStore from '../../../dataSources/cloudFirestore/partner';
import sessionStore from '../../../dataSources/cloudFirestore/session';
import productStore from '../../../dataSources/cloudFirestore/product';
import milestoneResolver from './milestone';

const favoriteStore = dataSources.cloudFirestore.favorites;
const favoriteType = 'event';
const assetStore = dataSources.cloudFirestore.assets;
const entityType = 'EVENT';
const dlog = debug('that:api:event:query');

export const fieldResolvers = {
  EventQuery: {
    get: ({ eventId }, _, { dataSources: { firestore } }) => {
      dlog('EventQuery.get');
      return eventStore(firestore).get(eventId);
    },
    partners: ({ eventId }) => {
      dlog('EventQuery.partners');
      return { eventId };
    },
    sessionById: (
      { eventId },
      { sessionId },
      { dataSources: { firestore } },
    ) => {
      dlog('EventQuery sessionById called');
      return sessionStore(firestore).findApprovedById(eventId, sessionId);
    },
    sessionBySlug: ({ eventId }, { slug }, { dataSources: { firestore } }) => {
      dlog('EventQuery sessionBySlug called');
      return sessionStore(firestore).findApprovedBySlug(eventId, slug);
    },
    registration: ({ eventId }) => ({ eventId }),
  },
  Event: {
    __resolveReference({ id }, { dataSources: { eventLoader } }) {
      dlog('resolve reference');
      return eventLoader.load(id);
    },
    notifications: notificationResolver.notifications,
    milestones: milestoneResolver.milestones,
    isVotingOpen: ({ voteOpenDate, voteCloseDate }) => {
      const now = new Date().getTime();
      const open = new Date(voteOpenDate).getTime();
      const close = new Date(voteCloseDate).getTime();
      return now >= open && now <= close;
    },
    venues: ({ venues }, args, { dataSources: { firestore } }) => {
      dlog('Event:venues');
      return venueStore(firestore).findByIds(venues);
    },
    partners: ({ id }, args, { dataSources: { firestore } }) => {
      dlog('partners %s', id);

      return partnerStore(firestore)
        .findAll(id)
        .then(r =>
          r.map(item => ({
            ...item,
            __typename: 'Partner',
          })),
        );
    },
    sessions: (
      { id },
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
        'sessions called: event %s, page size %d, after %s, orderedBy %s, having statuses %o with filter %s',
        id,
        pageSize,
        cursor,
        orderBy,
        status,
        filter,
      );

      // get sessions by event id
      return sessionStore(firestore).findByEventIdWithStatuses({
        eventId: id,
        statuses: status,
        filter,
        asOfDate,
        orderBy,
        pageSize,
        cursor,
      });
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
      dlog('assets for event called');
      return assetStore(firestore).findEntityAssets({
        entityId,
        entityType,
      });
    },
    products: ({ id: eventId }, __, { dataSources: { firestore } }) => {
      dlog('products for event called %s', eventId);
      return productStore(firestore).findAllEnabled({ eventId });
    },
    isCallForOnSpeakersOpen: ({
      callForOnSpeakersOpenDate,
      callForOnSpeakersCloseDate,
    }) => {
      const now = new Date();
      if (
        !(callForOnSpeakersOpenDate instanceof Date) ||
        !(callForOnSpeakersCloseDate instanceof Date)
      )
        return false;

      return (
        callForOnSpeakersOpenDate < callForOnSpeakersCloseDate &&
        now > callForOnSpeakersOpenDate &&
        now < callForOnSpeakersCloseDate
      );
    },
    isCallForSpeakersOpen: ({
      callForSpeakersOpenDate,
      callForSpeakersCloseDate,
    }) => {
      const now = new Date();
      if (
        !(callForSpeakersOpenDate instanceof Date) ||
        !(callForSpeakersCloseDate instanceof Date)
      )
        return false;

      let result = false;
      if (
        callForSpeakersOpenDate < callForSpeakersCloseDate &&
        now > callForSpeakersOpenDate &&
        now < callForSpeakersCloseDate
      )
        result = true;

      return result;
    },
    scheduleDownload: ({ id: eventId }) => ({ eventId }),
    speakers: ({ id: eventId }, __, { dataSources: { firestore } }) => {
      dlog('event speakers resolver called');
      return sessionStore(firestore).findAllSpeakersForEvent({ eventId });
    },
    admin: ({ id: eventId }) => ({ eventId }),
  },
};
