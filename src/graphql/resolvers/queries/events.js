import debug from 'debug';

import eventStore from '../../../dataSources/cloudFirestore/event';
import eventFindBy from '../../../lib/eventFindBy';

const dlog = debug('that:api:events:query');

export const fieldResolvers = {
  EventsQuery: {
    all: (_, { type }, { dataSources: { firestore } }) => {
      dlog('EventsQuery.all', type);
      // return eventStore(firestore).getAll();
      let dataSource;
      if (type) {
        dlog('by event type');
        dataSource = eventStore(firestore).getAllByType(type);
      } else {
        dlog('all events');
        dataSource = eventStore(firestore).getAll();
      }

      return dataSource;
    },
    event: (_, { findBy }, { dataSources: { firestore } }) => {
      dlog('EventsQuery.event');
      return eventFindBy(findBy, firestore);
    },
    me: () => {
      dlog('me called');
      return {};
    },
    slugs: (_, __, { dataSources: { firestore } }) => {
      dlog('slugs called');
      const fields = ['slug'];
      return eventStore(firestore)
        .findAllActive(fields)
        .then(data => data.map(doc => doc.slug));
    },
  },
};
