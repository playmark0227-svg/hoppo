const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'assets/images/icon-source.png');
const outputs = [
  ['assets/images/icon-192.png', 192],
  ['assets/images/icon-512.png', 512],
  ['assets/images/icon-maskable-512.png', 512],
  ['assets/line/profile-icon.png', 640]
];

Promise.all(outputs.map(async ([name, size]) => {
  const target = path.join(root, name);
  const info = await sharp(source).resize(size, size).png({ compressionLevel: 9 }).toFile(target);
  process.stdout.write(`${name}: ${info.width}x${info.height}\n`);
})).catch(error => { console.error(error); process.exitCode = 1; });
