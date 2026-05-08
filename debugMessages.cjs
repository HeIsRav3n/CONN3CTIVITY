const https = require('https');
require('dotenv').config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });
    req.on('error', reject);
    req.end();
  });
}

fetchJSON('https://discord.com/api/v10/channels/1502093815522004992/messages?limit=10').then(msgs => console.log(JSON.stringify(msgs, null, 2)));
