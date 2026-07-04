const fs = require('fs');
const path = require('path');
const { encode } = require('ico-endec');

const iconPath = path.join(__dirname, 'assets', 'icon.png');
const outPath = path.join(__dirname, 'assets', 'icon.ico');

const pngData = fs.readFileSync(iconPath);
const icoData = encode([pngData]);
fs.writeFileSync(outPath, Buffer.from(icoData));
console.log('Created icon.ico');
