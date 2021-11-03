import debug from 'debug';
import { dataSources } from '@thatconference/api';
import checkMemberEventAccess from '../../../lib/checkMemberEventAccess';
import eventFindBy from '../../../lib/eventFindBy';
import orderStore from '../../../dataSources/cloudFirestore/order';

const eventSpeakerStore = dataSources.cloudFirestore.eventSpeaker;

const dlog = debug('that:api:events:me:query');

export const fieldResolvers = {
  MeEventQuery: {
    favorites: () => {
      dlog('meEventQuery called');
      return {};
    },
    access: (_, { eventId }) => ({ eventId }),
    hasAccess: (_, { eventId }, { dataSources: { firestore }, user }) => {
      dlog('user %s have access to Event %s?', user.sub, eventId);
      return checkMemberEventAccess({ user, eventId, firestore });
    },
    acceptedSpeaker: (_, { findBy }, { dataSources: { firestore }, user }) => {
      dlog('acceptedSpeaker query for %d in event %o', user.sub, findBy);
      return eventFindBy(findBy, firestore).then(({ eventId }) =>
        eventSpeakerStore(firestore).get({
          eventId,
          memberId: user.sub,
        }),
      );
    },
    orders: (
      _,
      { findBy, orderType = 'REGULAR' },
      { dataSources: { firestore }, user },
    ) => {
      dlog('me order for event');
      return eventFindBy(findBy, firestore).then(({ eventId }) =>
        orderStore(firestore).findOrderByEventMemberType({
          eventId,
          memberId: user.sub,
          orderType,
        }),
      );
    },
  },
};
