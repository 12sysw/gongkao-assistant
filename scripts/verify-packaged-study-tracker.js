const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const asar = require('@electron/asar');

const projectRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(projectRoot, 'docs', 'KAOGONG_STUDY_TRACKER_SNAPSHOT.json');

function normalizeArchiveEntry(entry) {
  return entry.replace(/^[/\\]+/, '').split(path.sep).join('/').replaceAll('\\', '/');
}

function expectedEntries(files) {
  const entries = new Set();
  for (const file of files) {
    entries.add(file.path);
    const parts = file.path.split('/');
    for (let index = 1; index < parts.length; index += 1) {
      entries.add(parts.slice(0, index).join('/'));
    }
  }
  return [...entries].sort();
}

function verifyPackagedSnapshot(archivePath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const prefix = 'dist/main/skills/kaogong-study-tracker/';
  const actualEntries = asar
    .listPackage(archivePath)
    .map(normalizeArchiveEntry)
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => entry.slice(prefix.length))
    .filter(Boolean)
    .sort();
  const expected = expectedEntries(manifest.files);

  if (JSON.stringify(actualEntries) !== JSON.stringify(expected)) {
    const missing = expected.filter((entry) => !actualEntries.includes(entry));
    const extra = actualEntries.filter((entry) => !expected.includes(entry));
    throw new Error(`Packaged snapshot file set changed. Missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}.`);
  }

  for (const entry of manifest.files) {
    const archiveEntry = path.join('dist', 'main', 'skills', 'kaogong-study-tracker', ...entry.path.split('/'));
    const content = asar.extractFile(archivePath, archiveEntry);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    if (hash !== entry.sha256) {
      throw new Error(`Packaged snapshot hash mismatch: ${entry.path}`);
    }
  }

  return {
    archivePath,
    commit: manifest.upstream_commit,
    fileCount: manifest.files.length,
  };
}

if (require.main === module) {
  const archivePath = process.argv[2]
    ? path.resolve(projectRoot, process.argv[2])
    : path.join(projectRoot, 'release', 'win-unpacked', 'resources', 'app.asar');
  const result = verifyPackagedSnapshot(archivePath);
  console.log(`[study-tracker-package] verified ${result.fileCount} files at ${result.commit}`);
}

module.exports = { verifyPackagedSnapshot };
