const { removeBackground } = require('@imgly/background-removal-node');
const fs = require('fs');

async function processImage(inputPath, outputPath) {
    try {
        console.log(`Processing ${inputPath}...`);
        const blob = await removeBackground(inputPath);
        const buffer = Buffer.from(await blob.arrayBuffer());
        fs.writeFileSync(outputPath, buffer);
        console.log(`Saved transparent image to ${outputPath}`);
    } catch (err) {
        console.error(`Error processing ${inputPath}:`, err);
    }
}

async function main() {
    await processImage('public/mascot-gm.png', 'public/mascot-gm-transparent.png');
    await processImage('public/mascot-cm.png', 'public/mascot-cm-transparent.png');
}

main();
