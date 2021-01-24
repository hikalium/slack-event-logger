const fs = require('fs');
const {WebClient} = require('@slack/web-api');
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Read secrets in .env file
require('dotenv').config();
const token = process.env.SLACK_TOKEN;
const channelId = process.env.SLACK_CHANNEL_ID;

const web = new WebClient(token);

const terms = JSON.parse(fs.readFileSync('terms.json'));

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<head>
  <meta charset="utf-8">
  <title>slack-event-logger</title>
<script src="/socket.io/socket.io.js"></script>
<script>
socket = io();
function sendMessage(s) {
  console.log("sendMessage: " + s);
  socket.emit("sendMessage", s);
}
</script>
<style>
button {
  height: 100px;
  width: 100px;
}
</style>
</head>
<body>
<h1>slack-event-logger</h1>
${
      terms.map(s => `<button onclick="sendMessage('${s}');">${s}</button>`)
          .join('\n')}
</body>
    `);
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
  socket.on('sendMessage', (s) => {
    console.log('sendMessage');
    (async () => {
      // See: https://api.slack.com/methods/chat.postMessage
      const res = await web.chat.postMessage({channel: channelId, text: s});

      // `res` contains information about the posted message
      console.log('Message sent: ', res.ts);
    })();
  });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});
