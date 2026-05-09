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

      const nodes = [
        // Central branding node
        {
          id: 'main',
          name: 'CONN3CTIVITY',
          avatar: 'https://heisrav3n.github.io/CONN3CTIVITY/assets/logo.png',
          role: 'Core',
          color: '#C9A96E',
          val: 30 
        },
        ...filteredMembers.map(member => {
          const avatarHash = member.user.avatar;
          const userId = member.user.id;
          const avatarUrl = avatarHash 
            ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(member.user.discriminator) % 5}.png`;

          return {
            id: userId,
            name: member.nick || member.user.username,
            avatar: avatarUrl,
            role: 'Conn3ctor',
            color: '#C9A96E'
          };
        })
      ];

      const links = [];
      // Connect everyone to the central node
      for (let i = 1; i < nodes.length; i++) {
        links.push({
          source: nodes[i].id,
          target: 'main',
          value: 2,
          color: 'rgba(201, 169, 110, 0.2)' // Subtle gold "strings"
        });

        // Add a few random peer-to-peer links
        const numPeerLinks = Math.floor(Math.random() * 2); 
        for (let j = 0; j < numPeerLinks; j++) {
          const targetIndex = Math.floor(Math.random() * (nodes.length - 1)) + 1;
          if (targetIndex !== i) {
            links.push({
              source: nodes[i].id,
              target: nodes[targetIndex].id,
              value: 1,
              color: 'rgba(255, 255, 255, 0.05)' // Very faint peer connections
            });
          }
        }
      }

      const graphData = { nodes, links };
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(graphData, null, 2));
      console.log(`Successfully saved mapped network data with ${nodes.length} nodes to ${OUTPUT_PATH}`);

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

  req.on('error', (error) => {
    console.error('Request failed:', error);
  });
  req.end();

  // --- 2. FETCH REAL ACTIVE COUNT (GUILD INSIGHTS) ---
  const insightReq = https.request(`https://discord.com/api/v10/guilds/${GUILD_ID}?with_counts=true`, options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (res.statusCode !== 200) return;
      const guild = JSON.parse(data);
      
      // Load the file we just saved to update only the counts
      const current = JSON.parse(fs.readFileSync('./src/data/serverInsights.json', 'utf8'));
      const updated = {
        ...current,
        approximate_presence_count: guild.approximate_presence_count,
        last_updated: new Date().toISOString()
      };
      
      fs.writeFileSync('./src/data/serverInsights.json', JSON.stringify(updated, null, 2));
      console.log(`Successfully updated active count: ${guild.approximate_presence_count} people.`);
    });
  });
  insightReq.on('error', (err) => console.error('Insights fetch failed:', err));
  insightReq.end();
};

fetchMembers();
