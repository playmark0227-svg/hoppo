const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const bear = fs.readFileSync(path.join(root, 'assets/images/icon-512.png')).toString('base64');
const cells = [
  { x: 0, y: 0, label: 'ホーム', en: 'HOME', number: '01', fill: '#f6eee5', icon: 'bear' },
  { x: 400, y: 0, label: 'クイズ', en: 'QUIZ', number: '02', fill: '#f3f7f6', icon: 'quiz' },
  { x: 800, y: 0, label: 'QR読み取り', en: 'SCAN', number: '03', fill: '#f7f2ec', icon: 'qr' },
  { x: 0, y: 405, label: 'スタンプ', en: 'STAMPS', number: '04', fill: '#eef4f7', icon: 'pin' },
  { x: 400, y: 405, label: 'ランキング', en: 'RANKING', number: '05', fill: '#f9f1ea', icon: 'rank' },
  { x: 800, y: 405, label: 'マイページ', en: 'MY PAGE', number: '06', fill: '#f1f5ec', icon: 'person' }
];
function icon(type, x, y) {
  const common = 'fill="none" stroke="#274c55" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"';
  if (type === 'bear') return `<image x="${x - 82}" y="${y - 78}" width="164" height="164" href="data:image/png;base64,${bear}"/>`;
  const p = {
    quiz: `<rect x="-57" y="-71" width="114" height="142" rx="9"/><path d="M-28 -27l10 11 19-25M12 -20h25M-28 25l10 11 19-25M12 32h25"/>`,
    qr: `<path d="M-64 -64h48v48h-48zM16 -64h48v48H16zM-64 16h48v48h-48z"/><path d="M-51 -51h22v22h-22zM29 -51h22v22H29zM-51 29h22v22h-22z"/><path d="M17 17h18v18H17zM47 18h17M47 35v29M17 49v15M32 49h16"/>`,
    pin: `<path d="M0 77s-60-66-60-111a60 60 0 0 1 120 0C60 11 0 77 0 77z"/><circle cx="0" cy="-32" r="21"/>`,
    rank: `<path d="M-66 69h132M-56 68V13h34v55M-16 68V-62h34V68M24 68V-18h34v86"/>`,
    person: `<circle cx="0" cy="-36" r="31"/><path d="M-67 71c0-38 22-58 67-58s67 20 67 58"/>`
  }[type];
  return `<g transform="translate(${x} ${y})" ${common}>${p}</g>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="810" viewBox="0 0 1200 810">
<rect width="1200" height="810" fill="#fff"/>
${cells.map(c => `<g>
  <rect x="${c.x}" y="${c.y}" width="400" height="405" fill="${c.fill}"/>
  <path d="M${c.x + 30} ${c.y + 30}h45" stroke="#cf6952" stroke-width="5"/>
  <text x="${c.x + 30}" y="${c.y + 72}" fill="#60747a" font-size="21" font-weight="700" letter-spacing="3" font-family="Arial,sans-serif">${c.number} / ${c.en}</text>
  ${icon(c.icon, c.x + 200, c.y + 174)}
  <text x="${c.x + 200}" y="${c.y + 332}" text-anchor="middle" fill="#213843" font-size="45" font-weight="700" font-family="Noto Sans CJK JP,Hiragino Sans,AppleGothic,sans-serif">${c.label}</text>
</g>`).join('')}
<path d="M400 0v810M800 0v810M0 405h1200" stroke="#d5dddd" stroke-width="3"/>
<rect x="1.5" y="1.5" width="1197" height="807" fill="none" stroke="#c9d5d5" stroke-width="3"/>
</svg>`;

const output = path.join(root, 'assets/line/richmenu.png');
fs.mkdirSync(path.dirname(output), { recursive: true });
sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(output).then(info => {
  process.stdout.write(`${output} ${info.width}x${info.height} ${info.size} bytes\n`);
}).catch(error => { console.error(error); process.exitCode = 1; });
