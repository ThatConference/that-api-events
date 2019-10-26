const event = dbInstance => {
  const collectionName = 'events';
  const eventsCol = dbInstance.collection(collectionName);

  const create = async newEvent => {
    const scrubbedEvent = newEvent;

    if (newEvent.website) scrubbedEvent.website = newEvent.website.href;

    const newDocument = await eventsCol.add(scrubbedEvent);

    return {
      id: newDocument.id,
      ...newEvent,
    };
  };

  const get = async id => {
    const docRef = dbInstance.doc(`${collectionName}/${id}`);
    const doc = await await docRef.get();

    return {
      id: doc.id,
      ...doc.data(),
    };
  };

  const getAll = async () => {
    const { docs } = await eventsCol.get();

    return docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));
  };

  return { create, getAll, get };
};

export default event;
