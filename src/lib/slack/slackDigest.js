import debug from 'debug';
import callSlackHook from './callSlackHook';
import envConfig from '../../envConfig';

const dlog = debug('that:api:sessions:slack-activitydigest');

function createActivityCard({ session, eventName }) {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*${session.title}*\n<!date^${
        new Date(session.startTime).getTime() / 1000
      }^{date} @ {time}|dates are hard>`,
    },
    accessory: {
      type: 'button',
      text: {
        type: 'plain_text',
        text: ':that-blue: Details',
        emoji: true,
      },
      url: `https://that.us/activities/${session.id}`,
    },
    fields: [
      {
        type: 'mrkdwn',
        text: `${eventName}`,
      },
    ],
  };
}

const divider = {
  type: 'divider',
};

export default function digestNextHours({ sessions, hours, events }) {
  dlog('call digest for next hours, %d', hours);

  const hourText =
    hours > 1
      ? `Activities in the Next ${hours} Hours`
      : 'Activities Coming in the Next Hour';
  const basePost = {
    channel: envConfig.sessionNotifSlackChannel,
    username: 'THAT.us Activity Bot',
    icon_emoji: ':that-blue:',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `:calendar:  ${hourText}  :calendar:`,
          emoji: true,
        },
      },
      divider,
    ],
  };

  sessions.forEach(session => {
    const [thisEvent] = events.filter(e => e.id === session.eventId);
    const eventName = thisEvent ? thisEvent.name : 'THAT';
    const card = createActivityCard({ session, eventName });
    basePost.blocks.push(card);
    basePost.blocks.push(divider);
  });

  return callSlackHook(basePost);
}
