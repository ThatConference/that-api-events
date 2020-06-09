import debug from 'debug';

import notificationResolver from './notification';
import venueStore from '../../../dataSources/cloudFirestore/venue';
import eventStore from '../../../dataSources/cloudFirestore/event';
import partnerStore from '../../../dataSources/cloudFirestore/partner';
import sessionStore from '../../../dataSources/cloudFirestore/session';
import milestoneResolver from './milestone';

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
  },
  Event: {
    notifications: notificationResolver.notifications,
    milestones: milestoneResolver.milestones,
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
    sessions: ({ id }, __, { dataSources: { firestore } }) => {
      dlog('sessions');

      return sessionStore(firestore).findAllApprovedByEventId(id);
    },
    session: ({ id }, { slug }, { dataSources: { firestore } }) => {
      dlog('session');
      return sessionStore(firestore).findApprovedBySlug(id, slug);
    },
  },
};
