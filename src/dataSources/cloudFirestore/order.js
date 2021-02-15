import debug from 'debug';
import { utility } from '@thatconference/api';

const dlog = debug('that:api:garage:datasources:firebase:order');
const { entityDateForge } = utility.firestoreDateForge;
const allocationDateForge = entityDateForge({ fields: ['lastUpdatedAt'] });

const collectionAllocationName = 'orderAllocations';

const order = dbInstance => {
  dlog('instance created');

  const allocationCollection = dbInstance.collection(collectionAllocationName);

  function findMeOrderAllocationsForEvent({ memberId, eventId }) {
    dlog(
      `findMeOrderAlocationsForEvent called for member %s on Event %s`,
      memberId,
      eventId,
    );
    return allocationCollection
      .where('allocatedTo', '==', memberId)
      .where('event', '==', eventId)
      .get()
      .then(querySnapshot =>
        querySnapshot.docs.map(d => {
          const r = {
            id: d.id,
            ...d.data(),
          };
          return allocationDateForge(r);
        }),
      );
  }

  return {
    findMeOrderAllocationsForEvent,
  };
};

export default order;
