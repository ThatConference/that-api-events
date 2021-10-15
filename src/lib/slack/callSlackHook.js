import fetch from 'node-fetch';
import debug from 'debug';
import * as Sentry from '@sentry/node';
import envConfig from '../../envConfig';

const dlog = debug('that:api:sessions:slack-callslackhook');

export default function callSlackHook(hookBody) {
  dlog('calling Slack hook');
  if (
    process.env.NODE_ENV === 'production' ||
    JSON.parse(process.env.TEST_SLACK_NOTIFICATIONS || false) === true
  ) {
    const slackUrl = envConfig.slackWebhookUrl;
    fetch(slackUrl, {
      method: 'post',
      body: JSON.stringify(hookBody),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.text())
      .then(res => dlog('Slack webhood response: %o', res))
      .catch(err => {
        dlog('ERROR sending slack notifcation: %O', err);
        Sentry.withScope(scope => {
          scope.setLevel('warning');
          scope.setContext('Failed to send post to Slack', { err, hookBody });
          Sentry.captureException(err);
        });
      });
  } else {
    dlog('DEVELOPMENT Env: SLACK PAYLOAD TO SEND 📢 : %o', hookBody);
  }
}
