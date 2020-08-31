import debug from 'debug';

const dlog = debug('that:api:events:datasources:firebase:members');

const collectionName = 'members';

const member = dbInstance => {
  dlog('instance created');

  const membersCollection = dbInstance.collection(collectionName);

  async function getMemberTotal() {
    dlog('total member count');
    return membersCollection
      .where('isDeactivated', '==', false)
      .select('firstName')
      .get()
      .then(snap => snap.size);
  }

  return { getMemberTotal };
};

export default member;
