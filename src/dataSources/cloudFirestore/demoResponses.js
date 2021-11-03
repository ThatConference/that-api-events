import debug from 'debug';

const dlog = debug('that:api:events:firstore:demoResponses');

const demos = dbInstance => {
  dlog('demoResponse instance created');

  const collectionName = 'demographicResponses';
  const demoCollection = dbInstance.collection(collectionName);

  function findByEventMember({ eventId, memberId }) {
    dlog('findByMemberId %s', memberId);
    return demoCollection
      .where('eventId', '==', eventId)
      .where('memberId', '==', memberId)
      .get()
      .then(querySnap =>
        querySnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        })),
      );
  }

  function saveResponses({ eventId, memberId, responses }) {
    dlog(
      'For event %s, saving %d responses for %s',
      eventId,
      responses?.length,
      memberId,
    );

    const batchWriter = dbInstance.batch();
    for (let j = 0; j < responses.length; j += 1) {
      const response = responses[j];
      if (!response.questionRef)
        throw new Error(
          'questionRef value missing, unable to save demographic reponses',
        );
      if (!response.questionText)
        throw new Error(
          'questionText value missing, unable to save demographic responses',
        );
      if (response.questionResponse === undefined)
        response.questionResponse = null;

      response.eventId = eventId;
      response.memberId = memberId;
      const docId = `${response.eventId}|${response.memberId}|${response.questionRef}`;
      const docRef = demoCollection.doc(docId);
      batchWriter.set(docRef, response);
    }

    return batchWriter.commit();
  }

  return { findByEventMember, saveResponses };
};

export default demos;
