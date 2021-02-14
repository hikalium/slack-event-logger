const fs = require('fs');
const {WebClient} = require('@slack/web-api');
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const crypto = require('crypto');

// Read secrets in .env file
require('dotenv').config();
const token = process.env.SLACK_TOKEN;
const channelId = process.env.SLACK_CHANNEL_ID;

const web = new WebClient(token);

const termsData = JSON.parse(fs.readFileSync('terms.json'));

const keyToTerm = {};
const termToKey = {};
for (const k in termsData) {
  const terms = termsData[k];
  for (const t of terms) {
    const key = crypto.createHash('md5').update(t).digest('hex');
    keyToTerm[key] = t;
    termToKey[t] = key;
  }
}
console.log(keyToTerm);
console.log(termToKey);

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<head>
  <meta charset="utf-8">
  <title>slack-event-logger</title>
<script src="/socket.io/socket.io.js"></script>
<style>
</style>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-giJF6kkoqNQ00vy+HMDP7azOuL0xtbfIcaT9wjKHr8RbDVddVHyTfAAsrekwKmP1" crossorigin="anonymous">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta1/dist/js/bootstrap.bundle.min.js" integrity="sha384-ygbV9kiqUc6oa4msXn9868pTtWMgiQaeYH7/t7LECLbyPA2x65Kgf80OJFdroafW" crossorigin="anonymous"></script>
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
</head>
<body>
<div class="container">
<h1>slack-event-logger</h1>
${
      Object.entries(termsData)
          .map((e) => {return `<h2>${e[0]}</h2>` + e[1].map(s => `
<p>
<button id="btn_${termToKey[s]}"type="button" class="btn btn-primary">
${s}
</button>
<span></span>
</p>`).join('\n')})
          .join('\n')}
</div>
<script>
socket = io();
socket.on('eventInfo', (id, name, recorded_at) => {
  console.log('eventInfo received: id=' + id + ' name=' + name + ' recorded_at=' + recorded_at);
  $('#btn_' + id)
    .removeClass('btn-primary')
    .addClass('btn-success');
  $('#btn_' + id + ' + span')
    .text(recorded_at);
});
socket.on('messageSent', (id) => {
  console.log('server notified that message sent: ' + id);
  $('#btn_' + id)
    .removeClass('btn-primary')
    .addClass('btn-success');
});
const buttonHandler = (e) => {
  const s = e.target.innerText;
  console.log("sendMessage: " + s);
  socket.emit("sendMessage", s);
}
const buttons = document.querySelectorAll(".btn");
console.log(buttons);
buttons.forEach((e) => {e.addEventListener("click", buttonHandler)});
socket.emit("requestEventInfos");
</script>
</body>
    `);
});

let eventLog = JSON.parse(fs.readFileSync('log.json', 'utf-8'));
// [{name: "", recorded_at: ""}, ...]

const recordEvent = async (s) => {
  // returns false if succeeded. returns error on failure.
  // See: https://api.slack.com/methods/chat.postMessage
  const res = await web.chat.postMessage({channel: channelId, text: s});
  // `res` contains information about the posted message
  if (!res.ok) {
    console.log('API failed: ', res.error);
    return res.error;
  }

  eventLog.push({name: s, recorded_at: (new Date()).toISOString()});
  console.log(eventLog);
  fs.writeFileSync('log.json', JSON.stringify(eventLog, null, ' '));
  return false;
};

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
  socket.on('requestEventInfos', () => {
    for (const e of eventLog) {
      if ((new Date().getTime()) - (new Date(e.recorded_at)).getTime() >
          1000 * 60 * 60 * 12) {
        continue;
      }
      socket.emit('eventInfo', termToKey[e.name], e.name, e.recorded_at);
    }
  });
  socket.on('sendMessage', (s) => {
    console.log('sendMessage');
    (async () => {
      const error = await recordEvent(s);
      if (error) return;
      console.log('Message sent.');
      socket.emit('messageSent', termToKey[s]);
    })();
  });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});
