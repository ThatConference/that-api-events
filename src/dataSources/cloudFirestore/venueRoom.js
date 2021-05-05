import debug from 'debug';
import slugify from 'slugify';

const dlog = debug('that:api:events:datasources:firebase:venueroom');
const slugOpts = {
  lower: true,
  strict: true,
};

const collectionName = 'venues';
const subCollectionName = 'rooms';

const venueroom = dbInstance => {
  dlog('venuerooms instance created');

  const venueCollection = dbInstance.collection(collectionName);

  function get(venueId, roomId) {
    dlog('get venueroom %s, from venue %s', roomId, venueId);
    const docRef = venueCollection
      .doc(venueId)
      .collection(subCollectionName)
      .doc(roomId);

    return docRef.get().then(docSnap => {
      let r = null;
      if (docSnap.exists) {
        r = {
          id: docSnap.id,
          ...docSnap.data(),
        };
      }
      return r;
    });
  }

  function getAll(venueId) {
    dlog('getAll for venue %s', venueId);
    return venueCollection
      .doc(venueId)
      .collection(subCollectionName)
      .orderBy('name', 'asc')
      .get()
      .then(qrySnap =>
        qrySnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })),
      );
  }

  function create(venueId, newVenueRoom) {
    dlog('create room for venue %s', venueId);
    const roomslug = slugify(newVenueRoom.name, slugOpts);
    const roomId = `${venueId}_${roomslug}`;
    const docRef = venueCollection
      .doc(venueId)
      .collection(subCollectionName)
      .doc(roomId);

    return docRef.create(newVenueRoom).then(() => get(venueId, roomId));
  }

  function update({ venueId, roomId, upVenueRoom }) {
    dlog('update venue room at venue %s, room %s', venueId, roomId);
    const docRef = venueCollection
      .doc(venueId)
      .collection(subCollectionName)
      .doc(roomId);

    return docRef.update(upVenueRoom).then(() => get(venueId, roomId));
  }

  return { get, getAll, create, update };
};

export default venueroom;
