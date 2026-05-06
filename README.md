# CONN3CTIVITY

Welcome to the **CONN3CTIVITY** frontend application. This is a high-performance, cinematic Web3 landing page built with React, Vite, Framer Motion, and Force-Graph.

## Prerequisites
- Node.js (v20+ recommended)
- npm or pnpm

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## Managing the Conn3ctor Map
The interactive "Conn3ction Map" visualizes live Discord server members who hold the "Conn3ctor" role.

To update the map data:
1. Ensure your `.env` file contains your Discord bot credentials:
   ```
   DISCORD_BOT_TOKEN=your_token_here
   DISCORD_GUILD_ID=your_server_id_here
   ```
2. Run the extraction script:
   ```bash
   node fetchDiscordMap.cjs
   ```
3. This will query the Discord API and overwrite `src/data/conn3ctors.json`. Commit the changes and push to automatically update the live site.

## Architecture
- **Framework**: React 18 + Vite
- **Animations**: Framer Motion
- **Map Visualization**: react-force-graph-2d
- **Analytics**: Vercel Analytics

## Deployment
This project is configured for seamless deployment on Vercel. Any push to the `main` branch will automatically trigger a production build.
