import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { localApiPlugin } from './vite-plugin-local-api.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of [
    'NEON_DATABASE_URL',
    'DISCORD_BOT_TOKEN',
    'DISCORD_GUILD_ID',
    'CONN3CTOR_ROLE_ID',
    'MVC_ROLE_ID',
    'CRON_SECRET',
  ]) {
    if (env[key]) process.env[key] = env[key]
  }

  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      localApiPlugin(),
    ],
    optimizeDeps: {
      include: ['three', '@react-three/fiber'],
    },
  }
})
