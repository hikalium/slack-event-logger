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
</style>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-giJF6kkoqNQ00vy+HMDP7azOuL0xtbfIcaT9wjKHr8RbDVddVHyTfAAsrekwKmP1" crossorigin="anonymous">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/js/bootstrap.bundle.min.js" integrity="sha384-ygbV9kiqUc6oa4msXn9868pTtWMgiQaeYH7/t7LECLbyPA2x65Kgf80OJFdroafW" crossorigin="anonymous"></script>
</head>
<body>
<div class="container">
<h1>slack-event-logger</h1>
${
      terms.map(s => `<p><button type="button" class="btn btn-primary" onclick="sendMessage('${s}');">${s}</button></p>`)
          .join('\n')}
</div>
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
