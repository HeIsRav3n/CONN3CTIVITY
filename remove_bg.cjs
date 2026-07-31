/**
 * One-off asset tool — not part of the default install.
 * Requires: npm i -D @imgly/background-removal-node
 * Usage:    node remove_bg.cjs
 */
'use strict'

async function main() {
  let removeBackground
  try {
    ;({ removeBackground } = require('@imgly/background-removal-node'))
  } catch {
    console.error('Install optional dep first: npm i -D @imgly/background-removal-node')
    process.exit(1)
  }

  const fs = require('fs')

  async function processImage(inputPath, outputPath) {
    console.log(`Processing ${inputPath}...`)
    const blob = await removeBackground(inputPath)
    const buffer = Buffer.from(await blob.arrayBuffer())
    fs.writeFileSync(outputPath, buffer)
    console.log(`Saved transparent image to ${outputPath}`)
  }

  await processImage('public/mascot-gm.png', 'public/mascot-gm-transparent.png')
  await processImage('public/mascot-cm.png', 'public/mascot-cm-transparent.png')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
