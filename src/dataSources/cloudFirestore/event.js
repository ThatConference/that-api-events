import debug from 'debug';
import { utility } from '@thatconference/api';
import dayjs from 'dayjs';
import constants from '../../constants';

const dlog = debug('that:api:events:datasources:firebase:event');
const eventDateForge = utility.firestoreDateForge.events;

const event = dbInstance => {
  dlog('event instance created');

  const collectionName = 'events';
  const eventsCol = dbInstance.collection(collectionName);
  const acceptedSpeakersCollectionname = 'acceptedSpeakers';

  const findBySlug = async slug => {
    dlog('find by slug');
    const slimSlug = slug.trim();
    const colSnapshot = eventsCol.where('slug', '==', slimSlug);
    const { size, docs } = await colSnapshot.get();

    let result = null;
    if (size === 1) {
      dlog('have 1 doc returned for slug %s', slimSlug);
      const [d] = docs;
      result = {
        id: d.id,
        ...d.data(),
      };
      result = eventDateForge(result);
    } else if (size > 1) {
      throw new Error(`Multiple Event slugs found for ${slimSlug}`);
    }

    return result;
  };

  const create = async newEvent => {
    dlog('create with slug %s', newEvent.slug);
    const scrubbedEvent = newEvent;
    scrubbedEvent.slug = scrubbedEvent.slug.trim();

    const slugCheck = await findBySlug(scrubbedEvent.slug);
    if (slugCheck)
      throw new Error(`Event slug, ${scrubbedEvent.slug}, is taken`);

    if (newEvent.website) scrubbedEvent.website = newEvent.website.href;

    const newDocument = await eventsCol.add(scrubbedEvent);

    return {
      id: newDocument.id,
      ...newEvent,
    };
  };

  async function get(id) {
    dlog('get');
    const doc = await dbInstance.doc(`${collectionName}/${id}`).get();

    let result = null;
    if (doc.exists) {
      result = {
        id: doc.id,
        ...doc.data(),
      };
      result = eventDateForge(result);
    }

    return result;
  }

  async function getBatch(ids) {
    dlog('getBatch %d', ids.length);
    if (!Array.isArray(ids))
      throw new Error('getBatch must receive an array of ids');

    return Promise.all(ids.map(id => get(id)));
  }

  const getAll = async () => {
    dlog('get all');
    const { docs } = await eventsCol.get();

    const results = docs.map(d => {
      const r = {
        id: d.id,
        ...d.data(),
      };
      return eventDateForge(r);
    });

    return results;
  };

  const getAllByType = async type => {
    dlog('getAllByType', type);
    const { docs } = await eventsCol.where('type', '==', type).get();

    return docs.map(ev => {
      const result = {
        id: ev.id,
        ...ev.data(),
      };
      return eventDateForge(result);
    });
  };

  function findAllActive(fields) {
    dlog('findAllActive');
    if (fields && !Array.isArray(fields))
      throw new Error('fields must be an array of field string values');
    let query = eventsCol.where('isActive', '==', true);
    if (fields) {
      query = query.select(...fields);
    }

    return query.get().then(data =>
      data.docs.map(doc => {
        const r = {
          id: doc.id,
          ...doc.data(),
        };
        return eventDateForge(r);
      }),
    );
  }

  const update = async (id, eventInput) => {
    dlog('update id: %s', id);
    const scrubbedEvent = eventInput;

    if (scrubbedEvent.slug) {
      scrubbedEvent.slug = scrubbedEvent.slug.trim();
      const slugCheck = await findBySlug(scrubbedEvent.slug);
      if (slugCheck) {
        if (slugCheck.id !== id)
          throw new Error(`Event slug, ${scrubbedEvent.slug}, is taken`);
      }
    }

    if (eventInput.website) scrubbedEvent.website = eventInput.website.href;

    const docRef = dbInstance.doc(`${collectionName}/${id}`);

    return docRef.update(eventInput).then(() => get(id));
  };

  const findActiveByCommunitySlug = async slug => {
    const slimslug = slug.trim().toLowerCase();
    dlog('findActiveByCommunitySlug %s', slimslug);
    const { docs } = await eventsCol
      .where('isActive', '==', true)
      .where('community', '==', slimslug)
      .where('endDate', '>=', new Date())
      .get();

    return docs.map(e => {
      const r = {
        id: e.id,
        ...e.data(),
      };
      return eventDateForge(r);
    });
  };

  const findActiveForPartnerByCommunitySlug = async slug => {
    const slimslug = slug.trim().toLowerCase();
    const targetDate = dayjs()
      .subtract(constants.THAT.PARTNERS.SPONSOR_EXPIRATION_DAYS, 'days')
      .toDate();
    dlog('findActiveForPartnerByCommunitySlug %s', slimslug);

    const { docs } = await eventsCol
      .where('isActive', '==', true)
      .where('community', '==', slimslug)
      .where('endDate', '>=', targetDate)
      .get();

    return docs.map(e => {
      const r = {
        id: e.id,
        ...e.data(),
      };
      return eventDateForge(r);
    });
  };

  const findFeaturedByCommunitySlug = async slug => {
    const slimslug = slug.trim().toLowerCase();
    dlog('findFeaturedByCommunitySlug %s', slimslug);
    const { docs } = await eventsCol
      .where('isActive', '==', true)
      .where('isFeatured', '==', true)
      .where('community', '==', slimslug)
      .where('endDate', '>=', new Date())
      .get();

    return docs.map(e => {
      const r = {
        id: e.id,
        ...e.data(),
      };
      return eventDateForge(r);
    });
  };

  const findAllByCommunitySlug = async slug => {
    const slimslug = slug.trim().toLowerCase();
    dlog('findAllByCommunitySlug %s', slimslug);
    const { docs } = await eventsCol.where('community', '==', slimslug).get();

    return docs.map(e => {
      const r = {
        id: e.id,
        ...e.data(),
      };
      return eventDateForge(r);
    });
  };

  const findFutureByCommunitySlug = async slug => {
    const slimslug = slug.trim().toLowerCase();
    dlog('findFutureByCommunitySlug %s', slimslug);
    const { docs } = await eventsCol
      .where('community', '==', slimslug)
      .where('startDate', '>', new Date())
      .get();

    return docs.map(e => {
      const r = {
        id: e.id,
        ...e.data(),
      };
      return eventDateForge(r);
    });
  };

  const findPastByCommunitySlug = async slug => {
    const slimslug = slug.trim().toLowerCase();
    dlog('findPastByCommunitySlug %s', slimslug);
    const { docs } = await eventsCol
      .where('community', '==', slimslug)
      .where('endDate', '<', new Date())
      .get();

    return docs.map(e => {
      const r = {
        id: e.id,
        ...e.data(),
      };
      return eventDateForge(r);
    });
  };

  function getCountByCommunitySlug(communitySlug) {
    const slimslug = communitySlug.trim().toLowerCase();
    return eventsCol
      .where('community', '==', slimslug)
      .select()
      .get()
      .then(docs => docs.size);
  }

  async function findIdFromSlug(slug) {
    dlog('findIdFromSlug %s', slug);
    const slimslug = slug.trim().toLowerCase();
    const { size, docs } = await eventsCol
      .where('slug', '==', slimslug)
      .select()
      .get();

    dlog('size: %d', size);
    let result = null;
    if (size === 1) {
      const [e] = docs;
      result = {
        id: e.id,
      };
    } else if (size > 1) {
      throw new Error(
        `Mulitple Event records found for slug ${slimslug} - ${size}`,
      );
    }

    return result;
  }

  async function getSlug(id) {
    dlog('find slug from id %s', id);
    const docRef = await eventsCol.doc(id).get();
    let result = null;
    if (docRef.exists) {
      result = {
        id: docRef.id,
        slug: docRef.get('slug'),
      };
    }

    return result;
  }

  function getAcceptedSpeakersForEvent({
    eventId,
    platform,
    statuses,
    agreedToSpeak,
    acceptedRoomBenefit,
    isSponsorSpeaker,
  }) {
    dlog('getting accepted speakers for event %s', eventId);
    dlog(
      'getAcceptedSpeakersForEvent: %s,%s,%s,%s,%s',
      eventId,
      platform,
      statuses,
      agreedToSpeak,
      isSponsorSpeaker,
    );

    let query = eventsCol
      .doc(eventId)
      .collection(acceptedSpeakersCollectionname);

    if (statuses) {
      if (!Array.isArray(statuses))
        throw new Error('statuses must be in the form of an array');
      query = query.where('status', 'in', statuses);
    }
    if (platform) {
      query = query.where('platform', '==', platform);
    }
    if (agreedToSpeak !== undefined && agreedToSpeak !== null) {
      query = query.where('agreeToSpeak', '==', agreedToSpeak);
    }
    if (acceptedRoomBenefit !== undefined && acceptedRoomBenefit !== null) {
      query = query.where('acceptRoomBenefit', '==', acceptedRoomBenefit);
    }
    if (isSponsorSpeaker !== undefined && isSponsorSpeaker !== null) {
      query = query.where('isSponsorSpeaker', '==', isSponsorSpeaker);
    }

    return query
      .get()
      .then(querySnap => querySnap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  return {
    create,
    getAll,
    getAllByType,
    findAllActive,
    get,
    getBatch,
    findBySlug,
    update,
    findActiveByCommunitySlug,
    findActiveForPartnerByCommunitySlug,
    findFeaturedByCommunitySlug,
    findAllByCommunitySlug,
    findFutureByCommunitySlug,
    findPastByCommunitySlug,
    getCountByCommunitySlug,
    findIdFromSlug,
    getSlug,
    getAcceptedSpeakersForEvent,
  };
};

export default event;
