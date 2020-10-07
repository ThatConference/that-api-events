import debug from 'debug';
import * as Sentry from '@sentry/node';
import { utility } from '@thatconference/api';

const dlog = debug('that:api:events:datasources:firebase:sessions');
const sessionDateForge = utility.firestoreDateForge.sessions;

const collectionName = 'sessions';
const approvedSessionStatuses = ['ACCEPTED', 'SCHEDULED', 'CANCELLED'];

function validateStatuses(statuses) {
  dlog('validateStatuses %o', statuses);
  if (!Array.isArray(statuses) || statuses.length === 0) {
    throw new Error('statuses must be in the form of an array with a value.');
  }
  const inStatus = statuses;
  const isIndex = inStatus.indexOf('APPROVED');
  if (isIndex >= 0) {
    inStatus.splice(isIndex, 1);
    inStatus.push(...approvedSessionStatuses);
  }
  if (inStatus > 10)
    throw new Error(`A maximum of 10 statuses may be queried for. ${statuses}`);

  dlog('statuses valdated %o', inStatus);
  return inStatus;
}

const session = dbInstance => {
  dlog('instance created');

  const sessionsCollection = dbInstance.collection(collectionName);

  async function findAllApprovedByEventId(eventId) {
    dlog('findAll');
    const { docs } = await sessionsCollection
      .where('eventId', '==', eventId)
      .where('status', 'in', approvedSessionStatuses)
      .select()
      .orderBy('startTime')
      .get();

    return docs.map(s => ({ id: s.id }));
  }

  async function findAllAcceptedByEventId(eventId) {
    dlog('findAll accpepted');
    const { docs } = await sessionsCollection
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

  function findAllAcceptedByEventIdBatch(eventIds) {
    dlog('findAll accpeted batch, %o', eventIds);
    if (!Array.isArray(eventIds)) {
      dlog('eventIds must be and array!!');
      return null;
    }
    const sessRefs = eventIds.map(e => findAllAcceptedByEventId(e));
    return Promise.all(sessRefs);
  }

  async function findAllApprovedActiveByEventIdAtDateHours(
    eventId,
    atDate,
    hoursAfter,
  ) {
    dlog(
      'findAllApprovedActiveByEventIdAtDateHours(eventId, atDate, hoursAfter)',
      eventId,
      atDate,
      hoursAfter,
    );
    let query = sessionsCollection
      .where('eventId', '==', eventId)
      .where('status', 'in', ['ACCEPTED', 'SCHEDULED']);

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
        dlog('fromdate - todate: %s - %s', fromdate, todate);
        query = query.where('startTime', '<=', todate);
      }
    }

    // Keeping with data as used by digest
    const { docs } = await query.orderBy('startTime').get();

    const results = docs.map(s => {
      const out = { id: s.id, ...s.data() };
      return sessionDateForge(out);
    });

    dlog('%s event returning %d documents', eventId, results.length);
    return results;
  }

  function findAllApprovedActiveByEventIdAtDate(eventId, atDate, daysAfter) {
    dlog(
      'findAllApprovedByEventIdAtDate(eventId, atDate, daysAfter)',
      eventId,
      atDate,
      daysAfter,
    );
    const hoursAfter = daysAfter ? daysAfter * 24 : 0;
    return findAllApprovedActiveByEventIdAtDateHours(
      eventId,
      atDate,
      hoursAfter,
    );
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
      };
    }

    return result;
  }

  async function findApprovedBySlug(eventId, slug) {
    dlog('find in event %s by slug %s', eventId, slug);
    const docSnap = await sessionsCollection
      .where('eventId', '==', eventId)
      .where('status', 'in', approvedSessionStatuses)
      .where('slug', '==', slug)
      .select()
      .get();

    let result = null;
    dlog('snap size', docSnap.size);
    if (docSnap.size === 1) {
      result = {
        id: docSnap.docs[0].id,
      };
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

    return result;
  }

  async function findByCommunityWithStatuses({
    communitySlug,
    statuses,
    orderBy,
    pagesize,
    cursor,
  }) {
    dlog('findByCommunityWithStatuses %s, %o', communitySlug, statuses);
    const slimslug = communitySlug.trim().toLowerCase();
    const inStatus = validateStatuses(statuses);
    let startTimeOrder = 'asc';
    if (orderBy === 'START_TIME_DESC') startTimeOrder = 'desc';
    const truePSize = Math.min(pagesize || 20, 100); // max page: 100
    let query = sessionsCollection
      .where('communities', 'array-contains', slimslug)
      .where('status', 'in', inStatus)
      .orderBy('startTime', startTimeOrder)
      .orderBy('createdAt', 'asc')
      .limit(truePSize)
      .select('startTime', 'createdAt');

    if (cursor) {
      // validate cursor
      const curObject = Buffer.from(cursor, 'base64').toString('utf8');
      const { curStartTime, curCreatedAt } = JSON.parse(curObject);
      dlog('decoded cursor:%s, %s, %s', curObject, curStartTime, curCreatedAt);
      if (!curStartTime || !curCreatedAt)
        throw new Error('Invalid cursor provided as cursor value');

      query = query.cursor(new Date(curStartTime), new Date(curCreatedAt));
    }

    const { size, docs } = await query.get();
    dlog('query returned %d documents', size);

    const sessions = docs.map(s => ({ id: s.id, ...s.data() }));
    const lastDoc = sessions[sessions.length - 1];
    let newCursor = '';
    if (lastDoc) {
      const cpieces = JSON.stringify({
        curStartTime: lastDoc.startTime.toMillis(),
        curCreatedAt: lastDoc.createdAt.toMillis(),
      });
      newCursor = Buffer.from(cpieces, 'utf8').toString('base64');
    }

    return {
      cursor: newCursor,
      sessions,
    };
  }

  async function findByEventIdWithStatuses(eventId, statuses) {
    dlog('findByEventIdWithStatus %s %o', eventId, statuses);
    const inStatus = validateStatuses(statuses);
    const { docs } = await sessionsCollection
      .where('eventId', '==', eventId)
      .where('status', 'in', inStatus)
      .get();

    const results = docs.map(s => {
      const out = { id: s.id, ...s.data() };
      return sessionDateForge(out);
    });

    return results;
  }

  function findByEventIdWithStatusesBatch(eventIds, statuses) {
    dlog('findByEventIdWithStatusBatch %o %o', eventIds, statuses);
    if (!Array.isArray(eventIds) || eventIds.length === 0)
      throw new Error('eventIds must be an array with a value.');
    if (!Array.isArray(statuses) || statuses.length === 0) {
      throw new Error('statuses must be in the form of an array with a value.');
    }
    const sessionFuncs = eventIds.map(e =>
      findByEventIdWithStatuses(e, statuses),
    );
    return Promise.all(sessionFuncs);
  }

  return {
    findAllApprovedByEventId,
    findAllAcceptedByEventId,
    findAllAcceptedByEventIdBatch,
    findAllApprovedActiveByEventIdAtDateHours,
    findAllApprovedActiveByEventIdAtDate,
    findApprovedById,
    findApprovedBySlug,
    findByCommunityWithStatuses,
    findByEventIdWithStatuses,
    findByEventIdWithStatusesBatch,
  };
};

export default session;
