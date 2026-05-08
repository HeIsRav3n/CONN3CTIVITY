const https = require('https');
require('dotenv').config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = '1501674400888520965';

const API_URL = `https://discord.com/api/v10/channels/${CHANNEL_ID}`;

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
    console.log(data);
  });
});

req.on('error', (e) => console.error(e));
req.end();
