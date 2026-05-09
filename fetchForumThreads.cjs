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
      // Fetch the last 20 messages from the thread to get the full story
      const messages = await fetchJSON(`https://discord.com/api/v10/channels/${thread.id}/messages?limit=20`);
      
      // Discord returns newest first, reverse it for chronological order
      const chronological = [...messages].reverse();
      const originalPost = chronological[0]; 
      
      // Helper to extract text from a message (content or embed)
      const getMsgText = (m) => {
        if (m.content) return m.content;
        if (m.embeds && m.embeds.length > 0) {
          return m.embeds[0].description || m.embeds[0].title || '';
        }
        return '';
      };

      scammers.push({
        id: thread.id,
        title: thread.name,
        description: getMsgText(originalPost) || 'View investigation for details.',
        author: originalPost ? originalPost.author.username : 'Unknown',
        timestamp: thread.thread_metadata ? thread.thread_metadata.create_timestamp : null,
        chat: chronological.map(m => ({
          author: m.author.username,
          content: getMsgText(m),
          timestamp: m.timestamp,
          attachments: m.attachments.map(a => a.url)
        })),
        embeds: originalPost ? originalPost.embeds : [],
        images: messages.flatMap(m => m.attachments.filter(a => a.content_type?.startsWith('image')).map(a => a.url))
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
