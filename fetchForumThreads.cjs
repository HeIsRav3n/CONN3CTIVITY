const https = require('https');
require('dotenv').config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const FORUM_CHANNEL_ID = '1501674400888520965';

const options = {
  method: 'GET',
  headers: {
    'Authorization': `Bot ${BOT_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        } else {
          resolve(JSON.parse(data));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchScammers() {
  try {
    const data = await fetchJSON(`https://discord.com/api/v10/guilds/${GUILD_ID}/threads/active`);
    const threads = data.threads.filter(t => t.parent_id === FORUM_CHANNEL_ID);
    console.log(`Found ${threads.length} active posts in forum.`);
    
    let scammers = [];
    
    for (const thread of threads) {
      const messages = await fetchJSON(`https://discord.com/api/v10/channels/${thread.id}/messages`);
      // Sort messages by ID or assume the oldest message (last in array) is the original post
      const originalPost = messages[messages.length - 1]; 
      
      scammers.push({
        id: thread.id,
        title: thread.name,
        description: originalPost ? originalPost.content : '',
        author: originalPost ? originalPost.author.username : thread.owner_id,
        embeds: originalPost ? originalPost.embeds : [],
        attachments: originalPost ? originalPost.attachments.map(a => a.url) : []
      });
    }
    
    console.log(JSON.stringify(scammers, null, 2));
    
    const fs = require('fs');
    fs.writeFileSync('./src/data/scammers.json', JSON.stringify(scammers, null, 2));
    console.log('Saved to src/data/scammers.json');
    
  } catch (error) {
    console.error(error);
  }
}

fetchScammers();
