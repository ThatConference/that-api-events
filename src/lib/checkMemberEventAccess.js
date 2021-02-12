import debug from 'debug';
import { dataSources } from '@thatconference/api';
import orderLib from '../dataSources/cloudFirestore/order';
import eventLib from '../dataSources/cloudFirestore/event';
import constants from '../constants';

const dlog = debug('that:api:events:checkMemberEventAccess');
const memberLib = dataSources.cloudFirestore.member;

export default function checkMemberEventAccess({
  memberId,
  eventId,
  firestore,
}) {
  dlog('checkMemberEventAccess called');

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
    const {
      isTicketRequiredToJoin,
      canMembershipJoin,
      startDate,
      endDate,
    } = event;
    const { isMember } = member;
    const tickets = allocations.filter(
      a => a.productType === constants.THAT.PRODUCT_TYPE.TICKET,
    );
    dlog('tickets:: %o', tickets);

    const now = new Date();
    let canJoin = false;

    if (now < startDate || now > endDate) canJoin = false;
    else if (!isTicketRequiredToJoin) canJoin = true;
    else if (isTicketRequiredToJoin && canMembershipJoin)
      canJoin = tickets.length > 0 || isMember;
    else if (isTicketRequiredToJoin && !canMembershipJoin)
      canJoin = tickets.length > 0;

    return canJoin;
  });
}
