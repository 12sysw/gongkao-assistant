const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, '../src/main/skills');
const destination = path.resolve(__dirname, '../dist/main/skills');

function copyDirectory(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const sourcePath = path.join(from, entry.name);
    const destinationPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

if (!fs.existsSync(source)) {
  console.log('[copy-skills] no bundled skills found');
  process.exit(0);
}

copyDirectory(source, destination);
console.log(`[copy-skills] copied ${source} -> ${destination}`);
