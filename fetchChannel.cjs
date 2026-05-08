const https = require('https');
require('dotenv').config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = '1501674400888520965';

const API_URL = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=20`;

const options = {
  method: 'GET',
  headers: {
    'Authorization': `Bot ${BOT_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(API_URL, options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`Error: Status Code ${res.statusCode}`);
      console.error(data);
      return;
    }
    const messages = JSON.parse(data);
    console.log(JSON.stringify(messages.map(m => ({
      author: m.author.username,
      content: m.content,
      embeds: m.embeds,
      attachments: m.attachments
    })), null, 2));
  });
});

req.on('error', (e) => console.error(e));
req.end();
