import debug from 'debug';
import { dataSources } from '@thatconference/api';
import orderLib from '../dataSources/cloudFirestore/order';
import eventLib from '../dataSources/cloudFirestore/event';
import constants from '../constants';

const dlog = debug('that:api:events:checkMemberEventAccess');
const memberLib = dataSources.cloudFirestore.member;

export default function checkMemberEventAccess({ user, eventId, firestore }) {
  dlog('checkMemberEventAccess called');

  const memberId = user.sub;
  let orderStore;
  let eventStore;
  let memberStore;
  try {
    orderStore = orderLib(firestore);
    eventStore = eventLib(firestore);
    memberStore = memberLib(firestore);
  } catch (err) {
    return Promise.reject(err);
  }

  const memberFunc = memberStore.get(memberId);
  const eventFunc = eventStore.get(eventId);
  const allocationFunc = orderStore.findMeOrderAllocationsForEvent({
    memberId,
    eventId,
  });

  return Promise.all([memberFunc, eventFunc, allocationFunc]).then(data => {
    const [member, event, allocations] = data;
    if (!event) throw new Error('Event record could not be found');
    const { isTicketRequiredToJoin = false, canMembershipJoin = false } = event;
    const { isMember = false } = member;
    const tickets = allocations.filter(
      a => a.productType === constants.THAT.PRODUCT_TYPE.TICKET,
    );
    dlog('tickets:: %o', tickets);
    dlog('isMember', isMember);

    let canJoin = false;

    if (user.permissions.includes('admin')) canJoin = true;
    else if (!isTicketRequiredToJoin) canJoin = true;
    else if (isTicketRequiredToJoin && canMembershipJoin)
      canJoin = tickets.length > 0 || isMember;
    else if (isTicketRequiredToJoin && !canMembershipJoin)
      canJoin = tickets.length > 0;

    dlog('can join::', canJoin);
    return canJoin;
  });
}
export const tests = { memberLib };
