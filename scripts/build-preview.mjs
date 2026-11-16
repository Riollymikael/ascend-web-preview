import { readFile, mkdir, copyFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const destination = path.join(root, 'dist');
const publicFiles = ['index.html', 'styles.css', 'script.js', 'background-video.mp4', 'favicon.ico'];
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const css = await readFile(path.join(root, 'styles.css'), 'utf8');
const assets = new Set([...`${html}\n${css}`.matchAll(/assets\/[a-zA-Z0-9_./-]+/g)].map(match => match[0]));
for (const file of [...publicFiles, ...assets]) {
  await access(path.join(root, file));
  await mkdir(path.dirname(path.join(destination, file)), { recursive: true });
  await copyFile(path.join(root, file), path.join(destination, file));
}
await writeFile(path.join(destination, '.nojekyll'), '');
console.log(`Prévia preparada: ${publicFiles.length + assets.size} arquivos públicos em dist/.`);
