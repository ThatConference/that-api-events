function configMissing(configKey) {
  throw new Error(`missing required .env setting for ${configKey}`);
}

const requiredConfig = () => ({
  postmarkApiToken:
    process.env.POSTMARK_API_TOKEN || configMissing('POSTMARK_API_TOKEN'),
  slackWebhookUrl:
    process.env.SLACK_WEBHOOK_URL || configMissing('SLACK_WEBHOOK_URL'),
  sessionNotifSlackChannel: '#that_board',
  defaultProfileImage:
    'https://images.that.tech/members/person-placeholder.jpg',
  notificationEmailFrom:
    process.env.NOTIFICATION_EMAIL_FROM || 'hello@thatconference.com',
  queueUpSocialsAddMonth: JSON.parse(
    process.env.QUEUE_UP_SOCIALS_ADD_MONTH || false,
  ),
});

export default requiredConfig();
