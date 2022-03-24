import debug from 'debug';
import { sortBy } from 'lodash';
import { utility } from '@thatconference/api';

const dlog = debug('that:api:events:datasources:firebase:events:partner');

function partnerCollection(dbInstance) {
  dlog('instance created');

  const eventDateForge = utility.firestoreDateForge.events;
  const collectionName = 'events';
  const subCollectionName = 'partners';

  async function findAll(eventId) {
    dlog('findAll');
    const colSnapshot = dbInstance
      .doc(`${collectionName}/${eventId}`)
      .collection(subCollectionName);

    const { docs } = await colSnapshot.get();

    const results = docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    const sortByA = [
      'PIONEER',
      'EXPLORER',
      'SCOUT',
      'CUB',
      'PATRON',
      'CORPORATE_PARTNER',
      'PARTNER',
      'PLATINUM',
      'GOLD',
      'SILVER',
      'BRONZE',
      'MEDIA',
    ];

    const sortedResults = sortBy(results, [
      item => sortByA.indexOf(item.level),
      'placement',
    ]);

    return sortedResults;
  }

  async function findByLevel(eventId, level) {
    dlog('findByLevel');

    const colSnapshot = dbInstance
      .doc(`${collectionName}/${eventId}`)
      .collection(subCollectionName)
      .where('level', '==', level);

    const { docs } = await colSnapshot.get();

    const results = docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    const sortedResult = sortBy(results, ['placement']);

    return sortedResult;
  }

  async function add(eventId, partnerId, partner) {
    dlog('add');

    const ref = dbInstance.doc(
      `${collectionName}/${eventId}/${subCollectionName}/${partnerId}`,
    );

    await ref.set(partner, { merge: true });
    const updatedDoc = await ref.get();

    return {
      id: ref.id,
      ...updatedDoc.data(),
    };
  }

  function update(eventId, partnerId, partner) {
    dlog('update');

    const documentRef = dbInstance.doc(
      `${collectionName}/${eventId}/${subCollectionName}/${partnerId}`,
    );

    return documentRef.update(partner).then(res => ({
      id: partnerId,
      ...partner,
    }));
  }

  function remove(eventId, partnerId) {
    dlog('remove');
    const documentRef = dbInstance.doc(
      `${collectionName}/${eventId}/${subCollectionName}/${partnerId}`,
    );

    return documentRef.delete().then(res => {
      dlog(`removed event ${eventId} notification: ${partnerId}`);
      return partnerId;
    });
  }

  async function findPartnerEvents(partnerId) {
    dlog('finding events sponsored by %s', partnerId);
    const eventCollection = dbInstance.collection(collectionName);
    // full event collection
    const eventList = await dbInstance
      .collectionGroup(collectionName)
      .get()
      .then(({ docs }) =>
        docs.map(d => {
          const r = { id: d.id, ...d.data() };
          return eventDateForge(r);
        }),
      );
    // find partner under each event
    const eventPartnerFuncs = eventList.map(e =>
      eventCollection
        .doc(e.id)
        .collection(subCollectionName)
        .doc(partnerId)
        .get()
        .then(docRef => {
          let r = null;
          if (docRef.exists) {
            r = {
              // id: docRef.id,
              partnerId: docRef.id,
              eventId: e.id,
              ...docRef.data(),
            };
          }
          return r;
        }),
    );
    // make request remove nulls
    const partnerEvents = await (
      await Promise.all(eventPartnerFuncs)
    ).filter(pe => pe !== null);

    dlog('Found partnered events: %o', partnerEvents);
    // return events matching the found partner events sort newest first
    return eventList
      .filter(e => partnerEvents.map(pe => pe.eventId).includes(e.id))
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }

  return { add, update, remove, findAll, findByLevel, findPartnerEvents };
}

export default partnerCollection;
