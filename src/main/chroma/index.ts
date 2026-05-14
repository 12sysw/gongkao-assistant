import { app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

const CHROMA_PORT = 8100;
const CHROMA_HOST = 'localhost';
const CHROMA_COLLECTION = 'gongkao_rag';
const CHROMA_DATA_DIR = path.join(app.getPath('userData'), 'chroma_data');
const STARTUP_TIMEOUT_MS = 30000;
const HEALTH_POLL_MS = 500;

let chromaProcess: ChildProcess | null = null;
let ready = false;

// ==================== Server Lifecycle ====================

export async function startChromaServer(): Promise<boolean> {
  if (ready) return true;

  // Find chroma executable
  const chromaBin = findChromaBin();
  if (!chromaBin) {
    console.warn('[ChromaDB] chroma executable not found, vector search will use fallback');
    return false;
  }

  // Ensure data dir
  if (!fs.existsSync(CHROMA_DATA_DIR)) {
    fs.mkdirSync(CHROMA_DATA_DIR, { recursive: true });
  }

  console.log(`[ChromaDB] Starting server on ${CHROMA_HOST}:${CHROMA_PORT}`);
  console.log(`[ChromaDB] Data dir: ${CHROMA_DATA_DIR}`);
  console.log(`[ChromaDB] Using bin: ${chromaBin}`);

  chromaProcess = spawn(chromaBin, [
    'run',
    '--host', CHROMA_HOST,
    '--port', String(CHROMA_PORT),
    '--path', CHROMA_DATA_DIR,
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  chromaProcess.stdout?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[ChromaDB] ${msg}`);
  });

  chromaProcess.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.error(`[ChromaDB] ${msg}`);
  });

  chromaProcess.on('exit', (code) => {
    console.log(`[ChromaDB] Server exited with code ${code}`);
    ready = false;
    chromaProcess = null;
  });

  chromaProcess.on('error', (err) => {
    console.error('[ChromaDB] Failed to start:', err.message);
    ready = false;
    chromaProcess = null;
  });

  // Wait for server to be healthy
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await healthCheck()) {
      ready = true;
      console.log('[ChromaDB] Server is ready');
      return true;
    }
    await sleep(HEALTH_POLL_MS);
  }

  console.warn('[ChromaDB] Server did not become ready in time');
  stopChromaServer();
  return false;
}

export function stopChromaServer() {
  if (chromaProcess && !chromaProcess.killed) {
    console.log('[ChromaDB] Stopping server');
    chromaProcess.kill();
    chromaProcess = null;
  }
  ready = false;
}

export function isChromaReady(): boolean {
  return ready;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const resp = await fetch(`http://${CHROMA_HOST}:${CHROMA_PORT}/api/v1/heartbeat`, {
      signal: AbortSignal.timeout(3000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export function getStatus() {
  return {
    running: ready,
    port: CHROMA_PORT,
    host: CHROMA_HOST,
    dataDir: CHROMA_DATA_DIR,
  };
}

// ==================== REST API Client ====================

const baseUrl = () => `http://${CHROMA_HOST}:${CHROMA_PORT}/api/v1`;

async function ensureCollection(): Promise<string | null> {
  try {
    // List collections and find ours
    const resp = await fetch(`${baseUrl()}/collections`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as any;
    const existing = (data ?? []).find((c: any) => c.name === CHROMA_COLLECTION);
    if (existing) return existing.id;

    // Create collection
    const createResp = await fetch(`${baseUrl()}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: CHROMA_COLLECTION,
        get_or_create: true,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!createResp.ok) return null;
    const created = (await createResp.json()) as any;
    return created.id;
  } catch (err) {
    console.error('[ChromaDB] ensureCollection error:', err);
    return null;
  }
}

async function getCollectionId(): Promise<string | null> {
  return ensureCollection();
}

/** Add documents with pre-computed embeddings to ChromaDB */
export async function addDocuments(docs: Array<{
  id: number;
  content: string;
  embedding: number[];
  metadata: Record<string, string>;
}>): Promise<boolean> {
  if (!ready) return false;
  const collectionId = await getCollectionId();
  if (!collectionId) return false;

  try {
    const resp = await fetch(`${baseUrl()}/collections/${collectionId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: docs.map((d) => String(d.id)),
        documents: docs.map((d) => d.content),
        embeddings: docs.map((d) => d.embedding),
        metadatas: docs.map((d) => d.metadata),
      }),
      signal: AbortSignal.timeout(10000),
    });
    return resp.ok;
  } catch (err) {
    console.error('[ChromaDB] addDocuments error:', err);
    return false;
  }
}

/** Query ChromaDB by embedding vector */
export async function queryByEmbedding(
  embedding: number[],
  topK: number = 10,
  where?: Record<string, string>,
): Promise<Array<{ id: string; score: number; content: string; metadata: Record<string, string> }>> {
  if (!ready) return [];
  const collectionId = await getCollectionId();
  if (!collectionId) return [];

  try {
    const body: any = {
      query_embeddings: [embedding],
      n_results: topK,
      include: ['documents', 'metadatas', 'distances'],
    };
    if (where) body.where = where;

    const resp = await fetch(`${baseUrl()}/collections/${collectionId}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return [];

    const data = (await resp.json()) as any;
    const ids = data.ids?.[0] ?? [];
    const distances = data.distances?.[0] ?? [];
    const documents = data.documents?.[0] ?? [];
    const metadatas = data.metadatas?.[0] ?? [];

    // ChromaDB returns cosine distance (lower = more similar), convert to similarity score
    return ids.map((id: string, i: number) => ({
      id,
      score: 1 - (distances[i] ?? 0),
      content: documents[i] ?? '',
      metadata: metadatas[i] ?? {},
    }));
  } catch (err) {
    console.error('[ChromaDB] queryByEmbedding error:', err);
    return [];
  }
}

/** Delete documents by IDs from ChromaDB */
export async function deleteDocuments(ids: number[]): Promise<boolean> {
  if (!ready) return false;
  const collectionId = await getCollectionId();
  if (!collectionId) return false;

  try {
    const resp = await fetch(`${baseUrl()}/collections/${collectionId}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ids.map(String) }),
      signal: AbortSignal.timeout(5000),
    });
    return resp.ok;
  } catch (err) {
    console.error('[ChromaDB] deleteDocuments error:', err);
    return false;
  }
}

/** Migrate existing SQLite embeddings to ChromaDB */
export async function migrateFromSqlite(
  docs: Array<{ id: number; content: string; embedding: string; title: string; category: string; source: string }>,
): Promise<{ migrated: number; failed: number }> {
  let migrated = 0;
  let failed = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const items = batch
      .filter((d) => d.embedding)
      .map((d) => {
        try {
          return {
            id: d.id,
            content: d.content,
            embedding: JSON.parse(d.embedding),
            metadata: { title: d.title, category: d.category, source: d.source },
          };
        } catch {
          failed++;
          return null;
        }
      })
      .filter(Boolean) as Array<{ id: number; content: string; embedding: number[]; metadata: Record<string, string> }>;

    if (items.length === 0) continue;

    const ok = await addDocuments(items);
    if (ok) migrated += items.length;
    else failed += items.length;
  }

  return { migrated, failed };
}

// ==================== Helpers ====================

function findChromaBin(): string | null {
  // Common locations for chroma executable
  const candidates = [
    // miniconda3 Scripts (Windows)
    path.join(process.env.USERPROFILE ?? '', 'miniconda3', 'Scripts', 'chroma.exe'),
    // miniconda3 bin (Unix)
    path.join(process.env.HOME ?? '', 'miniconda3', 'bin', 'chroma'),
    // anaconda3
    path.join(process.env.USERPROFILE ?? '', 'anaconda3', 'Scripts', 'chroma.exe'),
    path.join(process.env.HOME ?? '', 'anaconda3', 'bin', 'chroma'),
    // pip user install (Windows)
    path.join(process.env.APPDATA ?? '', 'Python', 'Scripts', 'chroma.exe'),
    // pip user install (Unix)
    path.join(process.env.HOME ?? '', '.local', 'bin', 'chroma'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // Try PATH lookup
  try {
    const { execSync } = require('child_process');
    const whichCmd = process.platform === 'win32' ? 'where chroma' : 'which chroma';
    const result = execSync(whichCmd, { encoding: 'utf-8', timeout: 3000 }).trim();
    if (result) return result.split('\n')[0].trim();
  } catch { /* not in PATH */ }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
