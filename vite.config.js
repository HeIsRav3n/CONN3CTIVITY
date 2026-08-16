import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { localApiPlugin } from './vite-plugin-local-api.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.NEON_DATABASE_URL) {
    process.env.NEON_DATABASE_URL = env.NEON_DATABASE_URL
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
