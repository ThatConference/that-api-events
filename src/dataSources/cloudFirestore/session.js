import debug from 'debug';
import * as Sentry from '@sentry/node';

const dlog = debug('that:api:events:datasources:firebase:sessions');

const collectionName = 'sessions';

const session = dbInstance => {
  dlog('instance created');

  const sessionsCollections = dbInstance.collection(collectionName);

  async function findAllApprovedByEventId(eventId) {
    dlog('findAll');
    const { docs } = await sessionsCollections
      .where('eventId', '==', eventId)
      .where('status', 'in', ['ACCEPTED', 'SCHEDULED', 'CANCELLED'])
      .get();

    const results = docs.map(d => ({
      id: d.id,
    }));

    return results;
  }

  async function findApprovedBySlug(eventId, slug) {
    dlog('find in event %s by slug %s', eventId, slug);
    const docSnap = await sessionsCollections
      .where('eventId', '==', eventId)
      .where('status', 'in', ['ACCEPTED', 'SCHEDULED', 'CANCELLED'])
      .where('slug', '==', slug)
      .get();

    let result = null;

    if (docSnap.size === 1) {
      result = docSnap.docs[0].data();
      result.id = docSnap.docs[0].id;
    } else if (docSnap.size > 0) {
      dlog(`Multple sessions return for event ${eventId}, with slug ${slug}`);
      Sentry.withScope(scope => {
        scope.setLevel('error');
        scope.setFingerprint('duplicate_slug');
        scope.setContent('duplicate_slug', {
          eventId,
          slug,
          duplicate_count: docSnap.size,
        });
        Sentry.captureException(new Error('duplicate slugs in event'));
      });
    }

    return result;
  }

  return { findAllApprovedByEventId, findApprovedBySlug };
};

export default session;
