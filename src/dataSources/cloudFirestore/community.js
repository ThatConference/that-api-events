import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources, utility } from '@thatconference/api';

const dlog = debug('that:api:events:datasources:firebase:community');
const slugStore = dataSources.cloudFirestore.slug;
const communityDateForge = utility.firestoreDateForge.communities;

const communityColName = 'communities';
const slugType = 'community';

function scrubCommunity({ community, user, isNew }) {
  const scrubbedCommunity = community;
  const rightNow = new Date();
  if (isNew) {
    scrubbedCommunity.createdAt = rightNow;
    scrubbedCommunity.createdBy = user.sub;
  }
  scrubbedCommunity.lastUpdatedAt = rightNow;
  scrubbedCommunity.lastUpdatedBy = user.sub;
  if (scrubbedCommunity.logo && scrubbedCommunity.logo.href)
    scrubbedCommunity.logo = scrubbedCommunity.logo.href;

  return scrubbedCommunity;
}

const community = dbInstance => {
  dlog('instance created');

  const communityCol = dbInstance.collection(communityColName);

  async function getAll() {
    dlog('getAll');
    const { docs } = await communityCol.get();

    return docs.map(cm => {
      const result = { id: cm.id, ...cm.data() };
      return communityDateForge(result);
    });
  }

  async function getAllActive({ fields }) {
    if (fields && !Array.isArray(fields))
      throw new Error('fields must be an array of field string values');

    let query = communityCol.where('status', '==', 'ACTIVE');
    if (fields) {
      query = query.select(...fields);
    }
    const { docs } = await query.get();

    return docs.map(cm => {
      const result = { id: cm.id, ...cm.data() };
      return communityDateForge(result);
    });
  }

  async function get(id) {
    dlog('get called %s', id);

    const doc = await dbInstance.doc(`${communityColName}/${id}`).get();

    let result = null;
    if (doc.exists) {
      result = {
        id: doc.id,
        ...doc.data(),
      };
      result = communityDateForge(result);
    }

    return result;
  }

  function getBatch(ids) {
    if (!Array.isArray(ids))
      throw new Error('getBatch must receive an array of ids');
    return Promise.all(ids.map(id => get(id)));
  }

  async function getSlug(id) {
    dlog('find slug from id %s', id);
    const doc = await dbInstance.doc(`${communityColName}/${id}`).get();

    let result = null;
    if (doc.exists) {
      result = {
        id: doc.id,
        slug: doc.get('slug'),
      };
    }

    return result;
  }

  async function findIdFromSlug(slug) {
    dlog('findIdFromSlug %s', slug);

    const slimslug = slug.trim().toLowerCase();
    const { size, docs } = await communityCol
      .where('slug', '==', slimslug)
      .select() // no fields selected so returns doc ref with no data :)
      .get();

    dlog('size: %O', size);
    let result = null;
    if (size === 1) {
      const [d] = docs;
      result = {
        id: d.id,
      };
    } else if (size > 1) {
      throw new Error(`Multiple Community records found for slug ${slimslug}`);
    }

    dlog('result: %O', result);
    return result;
  }

  async function findBySlug(slug) {
    dlog('findBySlug called %s', slug);

    const slimslug = slug.trim();
    const { size, docs } = await communityCol
      .where('slug', '==', slimslug)
      .get();
    let result = null;
    if (size === 1) {
      dlog('return doc for slug ', slimslug);
      const [d] = docs;
      result = {
        id: d.id,
        ...d.data(),
      };
      result = communityDateForge(result);
    } else if (size > 1) {
      throw new Error(`Multiple Community slugs found for slug ${slimslug}`);
    }

    return result;
  }

  function isSlugTaken(slug) {
    dlog('isSlugTaken called %s', slug);
    return slugStore(dbInstance).isSlugTaken(slug);
  }

  async function create({ newCommunity, user }) {
    dlog('create new community with slug %s', newCommunity.slug);
    const cleanCommunity = scrubCommunity({
      community: newCommunity,
      isNew: true,
      user,
    });
    const newSlug = cleanCommunity.slug;
    const slugInUse = await isSlugTaken(newSlug);
    if (slugInUse)
      throw new Error(
        'Slug in use, it cannot be used to create a new community',
      );

    const communityDocRef = communityCol.doc(); // creates a random id
    dlog('new community id %s');
    const slugDocRef = slugStore(dbInstance).getSlugDocRef(newSlug);
    const slugDoc = slugStore(dbInstance).makeSlugDoc({
      slugName: newSlug,
      type: slugType,
      referenceId: communityDocRef.id,
    });
    slugDoc.createdAt = cleanCommunity.createdAt;

    const writeBatch = dbInstance.batch();
    writeBatch.create(communityDocRef, cleanCommunity);
    writeBatch.create(slugDocRef, slugDoc);
    let writeResult;
    try {
      writeResult = await writeBatch.commit();
    } catch (err) {
      dlog('failed batch write create community and slug');
      Sentry.withScope(scope => {
        scope.setLevel('error');
        scope.setContext(
          'failed batch write create community and slug',
          { communityDocRef, cleanCommunity },
          { slugDocRef, slugDoc },
          { user: user.sub },
        );
        Sentry.captureException(err);
      });
      throw new Error('failed batch write create community and slug');
    }
    dlog('writeResult %o', writeResult);
    const out = {
      id: communityDocRef.id,
      ...cleanCommunity,
    };

    return communityDateForge(out);
  }

  async function createLocal({ newCommunity, user }) {
    dlog('create new community with slug %s', newCommunity.slug);
    const slugCheck = await isSlugTaken(newCommunity.slug);
    if (slugCheck)
      throw new Error('Slug is already in use. %s', newCommunity.slug);
    const cleanCommunity = scrubCommunity({
      community: newCommunity,
      user,
      isNew: true,
    });
    const newDocRef = await communityCol.add(cleanCommunity);
    const newDocument = await newDocRef.get();

    return {
      id: newDocument.id,
      ...newDocument.data(),
    };
  }

  async function update({ communityId, modifiedCommunity, user }) {
    dlog('update community. %s', communityId);
    const communityDocRef = dbInstance.doc(
      `${communityColName}/${communityId}`,
    );
    const moddedCommunity = scrubCommunity({
      community: modifiedCommunity,
      user,
      isNew: false,
    });

    await communityDocRef.update(moddedCommunity);

    return get(communityDocRef.id);
  }

  async function changeSlug({ communityId, newSlug, user }) {
    dlog(
      'change community slug called for: %s, newSlug: %s',
      communityId,
      newSlug,
    );
    const isNewInUse = await slugStore(dbInstance).isSlugTaken(newSlug);
    if (isNewInUse)
      throw new Error(
        'unable to change communuity slug, new slug in use already',
      );
    const communityDocRef = communityCol.doc(communityId);
    const docSnapshot = await communityDocRef.get();
    if (!docSnapshot.exists)
      throw new Error(
        'invalid communityId provided, unable to change community slug',
      );
    const cleanCommunity = scrubCommunity({
      community: {
        slug: newSlug,
      },
      user,
    });
    const currentSlug = docSnapshot.get('slug');
    const currentSlugDocRef = slugStore(dbInstance).getSlugDocRef(currentSlug);
    const newSlugDocRef = slugStore(dbInstance).getSlugDocRef(newSlug);
    const newSlugDoc = slugStore(dbInstance).makeSlugDoc({
      slugName: newSlug,
      type: slugType,
      referenceId: communityDocRef.id,
    });
    newSlugDoc.createdAt = cleanCommunity.lastUpdatedAt;

    const writeBatch = dbInstance.batch();
    writeBatch.delete(currentSlugDocRef);
    writeBatch.update(communityDocRef, cleanCommunity);
    writeBatch.create(newSlugDocRef, newSlugDoc);
    let writeResult;
    try {
      writeResult = await writeBatch.commit();
    } catch (err) {
      dlog('failed batch write change community slug');
      Sentry.withScope(scope => {
        scope.setLevel('error');
        scope.setContext(
          'failed batch write change community slug',
          { communityDocRef, cleanCommunity },
          { newSlugDocRef, newSlugDoc },
          { user: user.sub },
        );
        Sentry.captureException(err);
      });
      throw new Error('failed batch write change community slug');
    }
    dlog('writeResult %o', writeResult);

    return get(communityDocRef.id);
  }

  return {
    getAll,
    getAllActive,
    get,
    getBatch,
    getSlug,
    isSlugTaken,
    findIdFromSlug,
    findBySlug,
    create,
    update,
    changeSlug,
  };
};

export default community;
