/**
 * List guild soundboard sounds and download "Welcome To Conn3ctivity" if found.
 * Usage: node scripts/fetch-welcome-sound.cjs
 */
'use strict'

const fs = require('fs')
const path = require('path')
const https = require('https')
require('dotenv').config()

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = process.env.DISCORD_GUILD_ID || '1265954062789120050'
const OUT = path.join(__dirname, '..', 'public', 'welcome-conn3ctivity.ogg')

if (!BOT_TOKEN) {
  console.error('DISCORD_BOT_TOKEN missing')
  process.exit(1)
}

function discordGet(apiPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'discord.com',
      path: `/api/v10${apiPath}`,
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    }, (res) => {
      let body = ''
      res.on('data', (c) => { body += c })
      res.on('end', () => {
        if (res.statusCode >= 300) reject(new Error(`${apiPath} → ${res.statusCode} ${body}`))
        else resolve(JSON.parse(body))
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        download(res.headers.location, dest).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`download ${res.statusCode}`))
        return
      }
      const file = fs.createWriteStream(dest)
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve(dest)))
    }).on('error', reject)
  })
}

async function main() {
  // Prefer guild soundboard list; fall back to default sounds
  let sounds = []
  try {
    const data = await discordGet(`/guilds/${GUILD_ID}/soundboard-sounds`)
    sounds = Array.isArray(data) ? data : (data.items || data.sounds || [])
  } catch (e) {
    console.warn('Guild soundboard fetch failed:', e.message)
  }

  console.log(`Found ${sounds.length} guild soundboard sounds`)
  for (const s of sounds) {
    console.log(`- ${s.name} (${s.sound_id || s.id})`)
  }

  const match = sounds.find((s) =>
    /welcome.*conn3ct|conn3ct.*welcome|welcome to conn/i.test(s.name || '')
  ) || sounds.find((s) => /welcome/i.test(s.name || ''))

  if (!match) {
    console.error('No welcome sound found. Names printed above.')
    process.exit(2)
  }

  const soundId = match.sound_id || match.id
  const url = `https://cdn.discordapp.com/soundboard-sounds/${soundId}`
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  await download(url, OUT)
  console.log(`Saved: ${OUT}`)
  console.log(`Matched: ${match.name}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
