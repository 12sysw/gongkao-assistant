const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(projectRoot, 'docs', 'KAOGONG_STUDY_TRACKER_SNAPSHOT.json');

function listFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  };
  visit(root);
  return files.sort();
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function verifySnapshot(snapshotRoot) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const expected = [...manifest.files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const actualPaths = listFiles(snapshotRoot);
  const expectedPaths = expected.map((entry) => entry.path);

  if (manifest.file_count !== expected.length) {
    throw new Error(`Manifest file_count is ${manifest.file_count}, but it contains ${expected.length} entries.`);
  }
  if (actualPaths.length !== expected.length) {
    throw new Error(`Snapshot must contain exactly ${expected.length} files; found ${actualPaths.length} in ${snapshotRoot}.`);
  }
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    const missing = expectedPaths.filter((item) => !actualPaths.includes(item));
    const extra = actualPaths.filter((item) => !expectedPaths.includes(item));
    throw new Error(`Snapshot file set changed. Missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}.`);
  }

  for (const entry of expected) {
    const actualHash = sha256(path.join(snapshotRoot, ...entry.path.split('/')));
    if (actualHash !== entry.sha256) {
      throw new Error(`Snapshot hash mismatch: ${entry.path}`);
    }
  }

  return {
    root: snapshotRoot,
    repository: manifest.repository,
    commit: manifest.upstream_commit,
    fileCount: expected.length,
  };
}

if (require.main === module) {
  const requestedRoot = process.argv[2]
    ? path.resolve(projectRoot, process.argv[2])
    : path.resolve(projectRoot, 'src/main/skills/kaogong-study-tracker');
  const result = verifySnapshot(requestedRoot);
  console.log(`[study-tracker-snapshot] verified ${result.fileCount} files at ${result.commit}`);
}

module.exports = { listFiles, sha256, verifySnapshot };
