import debug from 'debug';
import partnerStore from '../../../dataSources/cloudFirestore/partner';

const dlog = debug('that:api:events:query:partner');

export const fieldResolvers = {
  // Type located in Partners api and extended here
  Partner: {
    sponsoredEvents: (
      { id: partnerId },
      __,
      { dataSources: { firestore } },
    ) => {
      dlog('getting sponsored events for partner %s', partnerId);
      return partnerStore(firestore).findPartnerEvents(partnerId);
    },
  },
};
