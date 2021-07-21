import debug from 'debug';
import { utility } from '@thatconference/api';
import * as Sentry from '@sentry/node';

const dlog = debug('that:api:events:datasources:firebase:order');
const { orderAllocations } = utility.firestoreDateForge;

const collectionAllocationName = 'orderAllocations';
const orderCollectionName = 'orders';

const scrubOrderAllocation = ({ orderAllocation, userId }) => {
  dlog('scrubOrderAllocation called');
  const scrubbedOa = orderAllocation;
  if (!scrubbedOa.lastUpdatedAt) scrubbedOa.lastUpdatedAt = new Date();
  scrubbedOa.lastUpdatedBy = userId;

  return scrubbedOa;
};

const order = dbInstance => {
  dlog('order instance created');

  const allocationCollection = dbInstance.collection(collectionAllocationName);
  const orderCollection = dbInstance.collection(orderCollectionName);

  function getOrderAllocation(allocationId) {
    dlog('getOrderAllocation called for %s', allocationId);
    return allocationCollection
      .doc(allocationId)
      .get()
      .then(docSnap => {
        let d = null;
        if (docSnap.exists) {
          d = {
            id: docSnap.id,
            ...docSnap.data(),
          };

          d = orderAllocations(d);
        }

        return d;
      });
  }

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
          return orderAllocations(r);
        }),
      );
  }

  function findAllCompleteOrdersForEvent(eventId) {
    dlog('findAllCompleteOrdersForEvent called on event %s', eventId);
    return orderCollection
      .where('event', '==', eventId)
      .where('status', '==', 'COMPLETE')
      .get()
      .then(querySnapshot => querySnapshot.docs.map(o => ({ id: o.id })));
  }

  function updateOrderAllocation({
    orderAllocationId,
    updateAllocation,
    userId,
  }) {
    dlog('checkInOrderAllocation called on %s', orderAllocationId);
    const scrubbedOa = scrubOrderAllocation({
      orderAllocation: updateAllocation,
      userId,
    });
    const docRef = allocationCollection.doc(orderAllocationId);
    return docRef
      .update(scrubbedOa)
      .then(() => ({ id: orderAllocationId }))
      .catch(err => {
        const exId = Sentry.captureException(err);
        throw new Error(`Order Allocation Update Exception: ${exId}`);
      });
  }

  function isPinInUse({ partnerPin, eventId }) {
    dlog('is pin %s in use within event %s', partnerPin, eventId);
    return allocationCollection
      .where('event', '==', eventId)
      .where('partnerPin', '==', partnerPin)
      .select()
      .get()
      .then(querySnap => querySnap.size > 0);
  }

  return {
    getOrderAllocation,
    findMeOrderAllocationsForEvent,
    findAllCompleteOrdersForEvent,
    updateOrderAllocation,
    isPinInUse,
  };
};

export default order;
