const fs = require('fs');
const {WebClient} = require('@slack/web-api');

// Read secrets in .env file
require('dotenv').config();
const token = process.env.SLACK_TOKEN;
const channelId = process.env.SLACK_CHANNEL_ID;

const web = new WebClient(token);

(async () => {
  // See: https://api.slack.com/methods/chat.postMessage
  const res = await web.chat.postMessage(
      {channel: channelId, text: 'Hello there'});

  // `res` contains information about the posted message
  console.log('Message sent: ', res.ts);
})();
