// Bundles the app into one self-contained page fragment (dist/wound-ballistics-lab.html):
// CSS and JS inlined, three.js loaded from cdnjs. Run: node tools/build.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const html = rd('index.html');
const body = html.split('<!--BODY-->')[1].split('<!--/BODY-->')[0].trim();
const font = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0];
const scripts = [...html.matchAll(/<script src="(src\/[^"]+)"><\/script>/g)].map((m) => rd(m[1]).replace(/<\/script/g, '<\\/script'));
const out = [
  '<title>Wound Ballistics Lab</title>', '<meta name="claude:viewport-fit-sides" content="cover">', font,
  '<style>\n' + rd('src/style.css') + '</style>', body,
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js"></script>',
  '<script>\n' + scripts.join('\n') + '\n</script>', '',
].join('\n');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/wound-ballistics-lab.html'), out);
console.log('dist/wound-ballistics-lab.html', (out.length / 1024).toFixed(0) + ' kB');
