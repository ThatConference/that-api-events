import debug from 'debug';
import * as Sentry from '@sentry/node';
import { utility } from '@thatconference/api';

const dlog = debug('that:api:events:datasources:firebase:sessions');
const sessionDateForge = utility.firestoreDateForge.sessions;
const { dateForge } = utility.firestoreDateForge;

const collectionName = 'sessions';
const approvedSessionStatuses = ['ACCEPTED', 'SCHEDULED', 'CANCELLED'];
const activeSessionStatuses = ['ACCEPTED', 'SCHEDULED'];

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
      .where('status', 'in', activeSessionStatuses);

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
      'findAllApprovedActiveByEventIdAtDate(eventId, atDate, daysAfter)',
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

  async function findByEventIdWithStatuses({
    eventId,
    statuses,
    orderBy,
    filter,
    asOfDate,
    pageSize,
    cursor,
  }) {
    dlog('findByCommunityWithStatuses %s, %o', eventId, statuses);
    const inStatus = validateStatuses(statuses);
    const truePSize = Math.min(pageSize || 20, 100); // max page: 100
    let allOrderBy = 'desc';
    if (orderBy === 'START_TIME_ASC') allOrderBy = 'asc';

    let startTimeOrder = 'asc';
    if (filter === 'PAST') {
      startTimeOrder = 'desc';
    } else if (filter === 'ALL') {
      startTimeOrder = allOrderBy;
    }

    let query = sessionsCollection
      .where('eventId', '==', eventId)
      .where('status', 'in', inStatus)
      .orderBy('startTime', startTimeOrder)
      .orderBy('createdAt', 'asc')
      .limit(truePSize)
      .select('startTime', 'createdAt');

    if (asOfDate && !cursor) {
      query = query.startAfter(new Date(asOfDate));
    } else if (cursor) {
      const curObject = Buffer.from(cursor, 'base64').toString('utf8');
      const { curStartTime, curCreatedAt, curEventId, curFilter } =
        JSON.parse(curObject);
      dlog('decoded cursor:%s, %s, %s', curObject, curStartTime, curCreatedAt);
      if (
        !curStartTime ||
        !curCreatedAt ||
        curEventId !== eventId ||
        (curFilter && curFilter !== filter)
      )
        throw new Error('Invalid cursor provided as cursor value');

      query = query.startAfter(new Date(curStartTime), new Date(curCreatedAt));
    }

    // query me
    const { size, docs } = await query.get();
    dlog('query returned %d documents', size);

    const sessions = docs.map(s => ({ id: s.id, ...s.data() }));
    const lastDoc = sessions[sessions.length - 1];
    let newCursor = '';
    if (lastDoc) {
      const cpieces = JSON.stringify({
        curStartTime: dateForge(lastDoc.startTime),
        curCreatedAt: dateForge(lastDoc.createdAt),
        curEventId: eventId,
        curFilter: filter,
      });
      newCursor = Buffer.from(cpieces, 'utf8').toString('base64');
    }

    return {
      cursor: newCursor,
      sessions,
      count: sessions.length,
    };
  }

  async function findByCommunityWithStatuses({
    communitySlug,
    statuses,
    orderBy,
    filter,
    asOfDate,
    pageSize,
    cursor,
  }) {
    dlog('findByCommunityWithStatuses %s, %o', communitySlug, statuses);
    const slimslug = communitySlug.trim().toLowerCase();
    const inStatus = validateStatuses(statuses);
    const truePSize = Math.min(pageSize || 20, 100); // max page: 100
    let allOrderBy = 'desc';
    if (orderBy === 'START_TIME_ASC') allOrderBy = 'asc';

    let startTimeOrder = 'asc';
    if (filter === 'PAST') {
      startTimeOrder = 'desc';
    } else if (filter === 'ALL') {
      startTimeOrder = allOrderBy;
    }

    let query = sessionsCollection
      .where('communities', 'array-contains', slimslug)
      .where('status', 'in', inStatus)
      .orderBy('startTime', startTimeOrder)
      .orderBy('createdAt', 'asc')
      .limit(truePSize)
      .select('startTime', 'createdAt');

    if (asOfDate && !cursor) {
      query = query.startAfter(new Date(asOfDate));
    } else if (cursor) {
      const curObject = Buffer.from(cursor, 'base64').toString('utf8');
      const { curStartTime, curCreatedAt, curCommunitySlug, curFilter } =
        JSON.parse(curObject);
      dlog('decoded cursor:%s, %s, %s', curObject, curStartTime, curCreatedAt);
      if (
        !curStartTime ||
        !curCreatedAt ||
        curCommunitySlug !== communitySlug ||
        (curFilter && curFilter !== filter)
      )
        throw new Error('Invalid cursor provided as cursor value');

      query = query.startAfter(new Date(curStartTime), new Date(curCreatedAt));
    }

    const { size, docs } = await query.get();
    dlog('query returned %d documents', size);

    const sessions = docs.map(s => ({ id: s.id, ...s.data() }));
    const lastDoc = sessions[sessions.length - 1];
    let newCursor = '';
    if (lastDoc) {
      const cpieces = JSON.stringify({
        curStartTime: dateForge(lastDoc.startTime),
        curCreatedAt: dateForge(lastDoc.createdAt),
        curCommunitySlug: communitySlug,
        curFilter: filter,
      });
      newCursor = Buffer.from(cpieces, 'utf8').toString('base64');
    }

    return {
      cursor: newCursor,
      sessions,
      count: sessions.length,
    };
  }

  async function getCountByCommunitySlug({ communitySlug }) {
    dlog('getCountByCommunitySlug %s', communitySlug);
    const slimslug = communitySlug.trim().toLowerCase();
    const { size } = await sessionsCollection
      .where('communities', 'array-contains', slimslug)
      .where('status', 'in', approvedSessionStatuses)
      .select()
      .get();

    return size;
  }

  async function getCountByCommunitySlugDate({
    communitySlug,
    date,
    direction,
  }) {
    dlog('getCountByCommunitySlug %s', communitySlug);
    const slimslug = communitySlug.trim().toLowerCase();
    let query = sessionsCollection
      .where('communities', 'array-contains', slimslug)
      .where('status', 'in', approvedSessionStatuses);

    if (direction === 'UPCOMING') query = query.where('startTime', '>=', date);
    if (direction === 'PAST') query = query.where('startTime', '<', date);

    const { size } = await query.select().get();

    return size;
  }

  async function getSessionStatsByCommunitySlug({ communitySlug, date }) {
    dlog('getTotalMinutesByCommunitySlug %s', communitySlug);
    const slimslug = communitySlug.trim().toLowerCase();
    let targetDate = new Date();
    if (date instanceof Date) targetDate = date;
    const query = sessionsCollection
      .where('communities', 'array-contains', slimslug)
      .where('status', 'in', activeSessionStatuses)
      .select('durationInMinutes', 'startTime');

    const { docs } = await query.get();
    const allSessions = docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    const stats = {
      totalActivities: 0,
      pastActivities: 0,
      upcomingActivities: 0,
      totalDuration: 0,
      pastDuration: 0,
      upcomingDuration: 0,
    };
    allSessions.forEach(s => {
      stats.totalActivities += 1;
      stats.totalDuration += s.durationInMinutes || 30;
      if (dateForge(s.startTime) < targetDate) {
        stats.pastActivities += 1;
        stats.pastDuration += s.durationInMinutes || 30;
      } else {
        stats.upcomingActivities += 1;
        stats.upcomingDuration += s.durationInMinutes || 30;
      }
    });

    return stats;
  }

  async function findAllByEventIdWithStatuses(eventId, statuses) {
    dlog('findAllByEventIdWithStatus %s %o', eventId, statuses);
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

  function findAllByEventIdWithStatusesBatch(eventIds, statuses) {
    dlog('findAllByEventIdWithStatusBatch %o %o', eventIds, statuses);
    if (!Array.isArray(eventIds) || eventIds.length === 0)
      throw new Error('eventIds must be an array with a value.');
    if (!Array.isArray(statuses) || statuses.length === 0) {
      throw new Error('statuses must be in the form of an array with a value.');
    }
    const sessionFuncs = eventIds.map(e =>
      findAllByEventIdWithStatuses(e, statuses),
    );
    return Promise.all(sessionFuncs);
  }

  function findAcceptedByEventIdSpeaker({ eventId, memberId }) {
    dlog(
      'findAllByEventIdMemberId called event: %s, member: %s',
      eventId,
      memberId,
    );

    return sessionsCollection
      .where('eventId', '==', eventId)
      .where('speakers', 'array-contains', memberId)
      .where('status', 'in', activeSessionStatuses)
      .select()
      .get()
      .then(querySnap => querySnap.docs.map(s => ({ id: s.id })));
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
    getCountByCommunitySlug,
    getCountByCommunitySlugDate,
    getSessionStatsByCommunitySlug,
    findByEventIdWithStatuses,
    findAllByEventIdWithStatuses,
    findAllByEventIdWithStatusesBatch,
    findAcceptedByEventIdSpeaker,
  };
};

export default session;
