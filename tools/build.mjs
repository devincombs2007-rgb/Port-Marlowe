import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
mkdirSync('dist', { recursive: true });
async function page(entry, shellFile, outBody, outFull) {
  const r = await build({ entryPoints: [entry], bundle: true, format: 'iife', write: false, target: 'es2020', minify: true, legalComments: 'none' });
  const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
  const body = `${readFileSync(shellFile, 'utf8')}\n<script>\n${js}\n</script>\n`;
  const full = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head><body>\n${body}</body></html>\n`;
  if (outBody) writeFileSync(outBody, body);
  writeFileSync(outFull, full);
  console.log(outFull, (full.length / 1024).toFixed(0), 'KB');
}
await page('src/main3d.js', 'web/shell3d.html', 'dist/artifact.html', 'dist/index.html');
await page('src/main.js', 'web/shell.html', null, 'dist/sandbox.html');
