import { EventEmitter } from 'events';
import debug from 'debug';
import { dataSources } from '@thatconference/api';
import * as Sentry from '@sentry/node';
import envConfig from '../envConfig';
import { SendEmailError } from '../lib/errors';

const dlog = debug('that:api:sessions:events:user');
const memberStore = dataSources.cloudFirestore.member;

function userEvents(postmark) {
  const userEventEmitter = new EventEmitter();
  dlog('user event emitter created');

  async function sendCheckinWelcomeEmail({
    memberId,
    firestore,
    partnerPin,
    eventSlug,
  }) {
    dlog('sendCheckinWelcomeEmail called for %s', memberId);
    // may be an unallocated ticket and doesn't have a memberId assigned
    if (!memberId) return undefined;
    let member = null;
    try {
      member = await memberStore(firestore).get(memberId);
    } catch (err) {
      process.nextTick(() => userEventEmitter.emit('emailError', err));
    }

    if (!member?.email) {
      Sentry.withScope(scope => {
        scope.setLevel(Sentry.Severity.Warning);
        scope.setTags({
          event: 'user',
          emit: 'registrationCheckIn',
          eventMemberId: memberId,
        });
        scope.setContext('member', member);
        Sentry.captureMessage(`Unable to send welcome email, member not found`);
      });
      return undefined;
    }

    return postmark.sendEmailWithTemplate({
      templateAlias: 'welcome-registration-checkin',
      from: envConfig.notificationEmailFrom,
      to: member.email,
      templateModel: {
        member: {
          firstName: member.firstName,
          lastName: member.lastName,
          partnerPin,
        },
        event: {
          slug: eventSlug,
        },
      },
      tag: 'welcome_checkin',
    });
  }

  userEventEmitter.on('emailError', err => {
    throw new SendEmailError(err.message);
  });

  userEventEmitter.on('registrationCheckIn', sendCheckinWelcomeEmail);

  return userEventEmitter;
}

export default userEvents;
