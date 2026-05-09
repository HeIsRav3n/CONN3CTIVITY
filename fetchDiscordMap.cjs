const https = require('https');
const fs = require('fs');
require('dotenv').config();

// --- SECRETS & CONFIG ---
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const ROLE_ID = '1266023149359599617';
const MVC_ROLE_ID = '1350853857701269534';
const OUTPUT_PATH = './src/data/conn3ctors.json';
const MVC_OUTPUT_PATH = './src/data/mvc.json';

const API_URL = `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000`;

const fetchMembers = () => {
  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  // --- 1. FETCH MEMBERS FOR MAP ---
  const req = https.request(API_URL, options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error(`Error: ${res.statusCode} - ${data}`);
        return;
      }

      const members = JSON.parse(data);
      console.log(`Found ${members.length} members in the guild.`);

      const filteredMembers = members.filter(member => member.roles.includes(ROLE_ID));
      console.log(`Found ${filteredMembers.length} users with the Conn3ctor role.`);

      const nodes = filteredMembers.map(member => {
        const avatarHash = member.user.avatar;
        const userId = member.user.id;
        const avatarUrl = avatarHash 
          ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(member.user.discriminator) % 5}.png`;

        return {
          id: userId,
          name: member.nick || member.user.username,
          avatar: avatarUrl,
          role: 'Conn3ctor'
        };
      });

      const links = [];
      for (let i = 0; i < nodes.length; i++) {
        const numLinks = Math.floor(Math.random() * 3) + 1; 
        for (let j = 0; j < numLinks; j++) {
          const targetIndex = Math.floor(Math.random() * nodes.length);
          if (targetIndex !== i) {
            links.push({
              source: nodes[i].id,
              target: nodes[targetIndex].id,
              value: Math.random()
            });
          }
        }
      }

      const graphData = { nodes, links };
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(graphData, null, 2));
      console.log(`Successfully saved mapped network data to ${OUTPUT_PATH}`);

      // Extract Insights (Now with Conn3ctor Count)
      const insights = {
        name: 'CONN3CTIVITY',
        conn3ctor_count: filteredMembers.length,
        approximate_presence_count: members.filter(m => m.presence?.status === 'online' || m.presence?.status === 'dnd' || m.presence?.status === 'idle').length || '500+',
        last_updated: new Date().toISOString()
      };
      fs.writeFileSync('./src/data/serverInsights.json', JSON.stringify(insights, null, 2));
      console.log('Successfully saved Server Insights to ./src/data/serverInsights.json');

      // Extract MVC
      const mvcMember = members.find(member => member.roles.includes(MVC_ROLE_ID));
      if (mvcMember) {
        const mvcAvatarHash = mvcMember.user.avatar;
        const mvcUserId = mvcMember.user.id;
        const mvcAvatarUrl = mvcAvatarHash 
          ? `https://cdn.discordapp.com/avatars/${mvcUserId}/${mvcAvatarHash}.png?size=256`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(mvcMember.user.discriminator) % 5}.png`;
        
        const nickname = mvcMember.nick || mvcMember.user.username;
        let xHandle = null;
        const xMatch = nickname.match(/@([a-zA-Z0-9_]{1,15})/);
        if (xMatch) xHandle = xMatch[1];

        const mvcData = {
          id: mvcUserId,
          username: nickname,
          avatar_url: mvcAvatarUrl,
          twitter: xHandle || "conn3ctivity_"
        };

        fs.writeFileSync(MVC_OUTPUT_PATH, JSON.stringify(mvcData, null, 2));
        console.log(`Successfully saved MVC data to ${MVC_OUTPUT_PATH}`);
      } else {
        console.log("No member found with the MVC role.");
      }
    });
  });

  req.end();
};

fetchMembers();
