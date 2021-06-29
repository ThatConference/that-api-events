import debug from 'debug';
import { constants } from '@thatconference/api';
import { RegistrationError } from '../../../lib/errors';
import orderStore from '../../../dataSources/cloudFirestore/order';

const dlog = debug('that:api:events:mutations:registration');

export const fieldResolvers = {
  RegistrationMutation: {
    checkin: async (
      { eventId },
      { orderAllocationId: allocationId, partnerPin = null },
      { dataSources: { firestore }, user },
    ) => {
      dlog(
        'Registration check-in called on event: %s, allocation: %s, PIN: %s',
        eventId,
        allocationId,
        partnerPin,
      );

      // eslint-disable-next-line no-param-reassign
      if (partnerPin === '') partnerPin = null;
      const funcs = [orderStore(firestore).getOrderAllocation(allocationId)];
      if (partnerPin) {
        funcs.push(orderStore(firestore).isPinInUse({ eventId, partnerPin }));
      } else {
        // null pin is fine and we'll write that to allocation. Promise.all returns `false`
        funcs.push(false);
      }

      const [allocation, isPinInUse] = await Promise.all(funcs);

      if (!allocation)
        throw new RegistrationError(
          `OrderAllocation ${allocationId} not found`,
        );
      if (allocation.event !== eventId)
        throw new RegistrationError(
          `OrderAllocation ${allocationId} not for current event ${eventId}`,
        );

      const result = {
        result: false,
        message: 'not set',
        pinSet: 'none',
      };

      if (allocation.checkedInAt || allocation.hasCheckedIn) {
        result.message = `This order allocation ${allocationId} is already checked in`;
      } else if (
        allocation.productType === constants.THAT.PRODUCT_TYPE.MEMBERSHIP
      ) {
        result.message = `Membership allocations not eligible for event check-in`;
      } else if (
        (!allocation.allocatedTo || allocation?.allocatedTo?.length < 5) &&
        (allocation.productType === constants.THAT.PRODUCT_TYPE.TICKET ||
          allocation.productType === constants.THAT.PRODUCT_TYPE.TRAINING)
      ) {
        result.message = `OrderAllocation ${allocationId} (${allocation.productType}) must be allocated to someone to be checked in`;
      } else if (
        (!allocation.allocatedTo || allocation?.allocatedTo?.length < 5) &&
        partnerPin
      ) {
        result.message = `Unable to set PIN on unallocated order allocation (${allocation.productType})`;
      } else if (isPinInUse) {
        result.message = `Partner Pin ${partnerPin} already in use`;
      } else {
        result.result = true;
        result.message = 'Checked In ✅';
        result.pinSet = partnerPin;
      }

      if (result.result === false) return result;

      const updateAllocation = {
        partnerPin,
        checkedInAt: new Date(),
        hasCheckedIn: true,
      };

      return orderStore(firestore)
        .updateOrderAllocation({
          orderAllocationId: allocationId,
          updateAllocation,
          userId: user.sub,
        })
        .then(() => result);
    },
    revertCheckin: async (
      { eventId },
      { orderAllocationId: allocationId },
      { dataSources: { firestore }, user },
    ) => {
      dlog(
        'Registration revert check-in called on event: %s, allocation: %s',
        eventId,
        allocationId,
      );
      const allocation = await orderStore(firestore).getOrderAllocation(
        allocationId,
      );

      if (!allocation)
        throw new RegistrationError(
          `OrderAllocation ${allocationId} not found`,
        );
      if (allocation.event !== eventId)
        throw new RegistrationError(
          `OrderAllocation ${allocationId} not for current event ${eventId}`,
        );

      const result = {
        result: false,
        message: 'not set',
      };

      if (!allocation.checkedInAt) {
        result.message = `This order allocation ${allocationId} is already NOT checked in`;
      } else {
        result.result = true;
        result.message = `Check-in reverted, PIN ${allocation.partnerPin} released.`;
      }

      if (result.result === false) return result;

      const updateAllocation = {
        partnerPin: null,
        checkedInAt: null,
        hasCheckedIn: false,
      };

      return orderStore(firestore)
        .updateOrderAllocation({
          orderAllocationId: allocationId,
          updateAllocation,
          userId: user.sub,
        })
        .then(() => result);
    },
    setPartnerPin: async (
      { eventId },
      { orderAllocationId: allocationId, partnerPin },
      { dataSources: { firestore }, user },
    ) => {
      dlog(
        'Registration check-in called on event: %s, allocation: %s, PIN: %s',
        eventId,
        allocationId,
        partnerPin,
      );
      const funcs = [
        orderStore(firestore).getOrderAllocation(allocationId),
        orderStore(firestore).isPinInUse({ eventId, partnerPin }),
      ];

      const [allocation, isPinInUse] = await Promise.all(funcs);

      if (!allocation)
        throw new RegistrationError(
          `OrderAllocation ${allocationId} not found`,
        );
      if (allocation.event !== eventId)
        throw new RegistrationError(
          `OrderAllocation ${allocationId} not for current event ${eventId}`,
        );

      const result = {
        result: false,
        message: 'not set',
      };

      if (!allocation.allocatedTo || allocation?.allocatedTo?.length < 5) {
        result.message = `Unable to set PIN on unallocated order allocation (${allocation.productType})`;
      } else if (allocation.hasCheckedIn !== true) {
        result.message = `This order allocation ${allocationId} is not checked in. Set pin during check-in`;
      } else if (allocation.partnerPin && allocation.partnerPin.length > 0) {
        result.message = `This order allocation already has associated pin: ${allocation.partnerPin}`;
      } else if (isPinInUse) {
        result.message = `Partner PIN ${partnerPin} already in use`;
      } else {
        result.result = true;
        result.message = `📍 PIN updated on order allocation`;
        result.pinSet = partnerPin;
      }

      if (result.result === false) return result;

      const updateAllocation = {
        partnerPin,
      };

      return orderStore(firestore)
        .updateOrderAllocation({
          orderAllocationId: allocationId,
          updateAllocation,
          userId: user.sub,
        })
        .then(() => result);
    },
  },
};
