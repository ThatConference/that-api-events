import debug from 'debug';
import * as Sentry from '@sentry/node';
import { utility } from '@thatconference/api';

const dlog = debug('that:api:events:datasources:firebase:sessions');
const sessionDateForge = utility.firestoreDateForge.sessions;

const collectionName = 'sessions';
const approvedSessionStatuses = ['ACCEPTED', 'SCHEDULED', 'CANCELLED'];

const session = dbInstance => {
  dlog('instance created');

  const sessionsCollections = dbInstance.collection(collectionName);

  async function findAllApprovedByEventId(eventId) {
    dlog('findAll');
    const { docs } = await sessionsCollections
      .where('eventId', '==', eventId)
      .where('status', 'in', approvedSessionStatuses)
      .orderBy('startTime')
      .get();

    const results = docs.map(s => {
      const out = { id: s.id, ...s.data() };
      return sessionDateForge(out);
    });

    return results;
  }

  async function findAllAcceptedByEventId(eventId) {
    dlog('findAll accpepted');
    const { docs } = await sessionsCollections
      .where('eventId', '==', eventId)
      .where('status', '==', 'ACCEPTED')
      .orderBy('startTime')
      .select('eventId', 'durationInMinutes', 'startTime')
      .get();

    const results = docs.map(s => {
      const out = { id: s.id, ...s.data() };
      return sessionDateForge(out);
    });

    return results;
  }

  async function findAllAcceptedByEventIdBatch(eventIds) {
    dlog('findAll accpeted batch, %o', eventIds);
    if (!eventIds.length) {
      dlog('eventIds must be and array!!');
      return null;
    }
    const sessRefs = eventIds.map(e => findAllAcceptedByEventId(e));
    return Promise.all(sessRefs);
  }

  async function findAllApprovedByEventIdAtDateHours(
    eventId,
    atDate,
    hoursAfter,
  ) {
    dlog(
      'findAllApprovedByEventIdAtDateHours(eventId, atDate, hoursAfter)',
      eventId,
      atDate,
      hoursAfter,
    );
    let query = sessionsCollections
      .where('eventId', '==', eventId)
      .where('status', 'in', approvedSessionStatuses);

    if (atDate) {
      const fromdate = new Date(atDate);
      query = query.where('startTime', '>=', fromdate);

      if (hoursAfter && hoursAfter > 0) {
        // 60 * 60 * 1000 = 3,600,000
        // -60000 to remove one minute, because:
        // 1:00 to 2:00 is 61 total minutes
        // 1:00 to 1:59 is 60 total minutes
        const todate = new Date(
          fromdate.getTime() + (hoursAfter * 3600000 - 60000),
        );
        dlog('todate', todate);
        query = query.where('startTime', '<=', todate);
      }
    }

    const { docs } = await query.orderBy('startTime').get();

    const results = docs.map(s => {
      const out = { id: s.id, ...s.data() };
      return sessionDateForge(out);
    });

    return results;
  }

  function findAllApprovedByEventIdAtDate(eventId, atDate, daysAfter) {
    dlog(
      'findAllApprovedByEventIdAtDate(eventId, atDate, daysAfter)',
      eventId,
      atDate,
      daysAfter,
    );
    const hoursAfter = daysAfter ? daysAfter * 24 : 0;
    return findAllApprovedByEventIdAtDateHours(eventId, atDate, hoursAfter);
  }

  async function findApprovedById(eventId, sessionId) {
    dlog('findApprovedById');

    const docRef = dbInstance.doc(`${collectionName}/${sessionId}`);
    const doc = await docRef.get();
    const currentSession = doc.data();

    let result = null;
    if (
      currentSession.eventId === eventId &&
      currentSession.status &&
      approvedSessionStatuses.includes(currentSession.status)
    ) {
      result = {
        id: doc.id,
        ...currentSession,
      };
      result = sessionDateForge(result);
    }

    return result;
  }

  async function findApprovedBySlug(eventId, slug) {
    dlog('find in event %s by slug %s', eventId, slug);
    const docSnap = await sessionsCollections
      .where('eventId', '==', eventId)
      .where('status', 'in', approvedSessionStatuses)
      .where('slug', '==', slug)
      .get();

    let result = null;
    dlog('snap size', docSnap.size);
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
        Sentry.captureMessage('duplicate slugs in event');
      });
    }

    return sessionDateForge(result);
  }

  return {
    findAllApprovedByEventId,
    findAllAcceptedByEventId,
    findAllAcceptedByEventIdBatch,
    findAllApprovedByEventIdAtDateHours,
    findAllApprovedByEventIdAtDate,
    findApprovedById,
    findApprovedBySlug,
  };
};

export default session;
