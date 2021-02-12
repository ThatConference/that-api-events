import debug from 'debug';
import { resolveType } from '@thatconference/schema';

const dlog = debug('that:api:events:datasources:firebase:product');
const resolveProductType = resolveType.productType;

const collectionName = 'products';

function product(dbInstance) {
  dlog('product instance created');

  const productCollection = dbInstance.collection(collectionName);

  function get(productId) {
    dlog('get product %s', productId);
    return productCollection
      .doc(productId)
      .get()
      .then(doc => {
        let result = null;
        if (doc.exists) {
          result = {
            id: doc.id,
            type: doc.get('type'),
            eventId: doc.get('eventId'),
          };
          result.__typename = resolveProductType(result.type);
        }
        dlog('get product result %O', result);
        return result;
      });
  }

  async function find({ eventId, productId }) {
    dlog('find product %s in event %s', productId, eventId);

    const { size, docs } = await productCollection
      .where('eventId', '==', eventId)
      .where('productId', '==', productId)
      .select('type')
      .get();

    if (size > 1)
      throw new Error(
        `product ${productId} exists on event ${eventId} multiple times.`,
      );

    let result = null;
    if (size === 1) {
      const [doc] = docs;
      result = {
        id: doc.id,
        ...doc.data(),
      };
      result.__typename = resolveProductType(result.type);
    }

    return result;
  }

  async function findAll({ eventId }) {
    dlog('findAll products for eventId %s', eventId);
    const { docs } = await productCollection
      .where('eventId', '==', eventId)
      .select('type')
      .get();

    return docs.map(p => {
      const result = { id: p.id, ...p.data() };
      result.__typename = resolveProductType(result.type);
      return result;
    });
  }

  async function findAllEnabled({ eventId }) {
    dlog('findAll enabled products for eventId %s', eventId);
    const { docs } = await productCollection
      .where('eventId', '==', eventId)
      .where('isEnabled', '==', true)
      .select('type')
      .get();

    return docs.map(p => {
      const result = { id: p.id, ...p.data() };
      result.__typename = resolveProductType(result.type);
      return result;
    });
  }

  function update({ productId, upProduct, __typename }) {
    dlog('internal update product on productId %s', productId);
    const docRef = productCollection.doc(productId);
    return docRef.update(upProduct).then(() => ({
      id: docRef.id,
      __typename,
    }));
  }

  async function addEvent({ eventId, productId, userId }) {
    dlog('Add product (%s) to event (%s)', productId, eventId);
    const productCheck = await get(productId);
    if (!productCheck)
      throw new Error(
        `Product ${productId} doesn't exist. Cannot add to event ${eventId}`,
      );
    if (productCheck.eventId)
      throw new Error(
        `Product ${productId} already part of event ${productCheck.eventId}, cannot add.`,
      );

    const upProduct = {
      eventId,
      lastUpdatedBy: userId,
      lastUpdatedAt: new Date(),
    };

    return update({
      productId,
      upProduct,
      __typename: resolveProductType(productCheck.type),
    });
  }

  async function updateEvent({ eventId, productId, userId }) {
    dlog('Update product %s to event %s', productId, eventId);
    const productCheck = await get(productId);
    if (!productCheck)
      throw new Error(
        `Product ${productId} doesn't exist. Cannot add to event ${eventId}`,
      );

    const upProduct = {
      eventId,
      lastUpdatedBy: userId,
      lastUpdatedAt: new Date(),
    };

    return update({
      productId,
      upProduct,
      __typename: resolveProductType(productCheck.type),
    });
  }

  async function removeEvent({ eventId, productId, userId }) {
    dlog('remove product %s from event %s', productId, eventId);
    const productCheck = await get(productId);
    if (!productCheck)
      throw new Error(
        `Product ${productId} doesn't exist. Cannot add to event ${eventId}`,
      );
    if (productCheck.eventId !== eventId) {
      throw new Error(
        `Product ${productId} is not assigned to event ${eventId} cannot remove event`,
      );
    }

    const upProduct = {
      eventId: '',
      lastUpdatedBy: userId,
      lastUpdatedAt: new Date(),
    };

    return update({
      productId,
      upProduct,
      __typename: resolveProductType(productCheck.type),
    });
  }

  return {
    get,
    find,
    findAll,
    findAllEnabled,
    addEvent,
    updateEvent,
    removeEvent,
  };
}

export default product;
