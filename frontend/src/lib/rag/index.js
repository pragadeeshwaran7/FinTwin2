// Client-side RAG: chunking, embeddings (Web Worker), IndexedDB storage per
// user, and hybrid retrieval (BM25 + cosine, fused with reciprocal rank).
// Documents never leave the browser; only the passages retrieved for a
// question are sent to the assistant.
import { extractPdf, extractText } from './pdf';
import { extractTransactions, looksLikeStatement, summarise } from './statement';

const DB_NAME = 'fintwin-rag';
const CHUNK = 900;
const OVERLAP = 150;

// ---------- IndexedDB ----------
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('docs', { keyPath: 'key' }).createIndex('user', 'userId');
      db.createObjectStore('chunks', { keyPath: 'key' }).createIndex('user', 'userId');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx(store, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const result = fn(t.objectStore(store));
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
  });
}
const allForUser = (store, userId) => tx(store, 'readonly', (s) => s.index('user').getAll(userId));

export async function listDocs(userId) {
  return (await allForUser('docs', userId)).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}
export async function deleteDoc(userId, docId) {
  const chunks = (await allForUser('chunks', userId)).filter((c) => c.docId === docId);
  await tx('chunks', 'readwrite', (s) => chunks.forEach((c) => s.delete(c.key)));
  await tx('docs', 'readwrite', (s) => s.delete(`${userId}:${docId}`));
}
export async function clearUser(userId) {
  for (const d of await listDocs(userId)) await deleteDoc(userId, d.id);
}

// ---------- Embeddings worker ----------
let worker = null;
let seq = 0;
const pending = new Map();
let embeddingsBroken = null;

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./embed.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const p = pending.get(data.id);
      if (data.type === 'progress') return (p || [...pending.values()][0])?.onProgress?.(data);
      if (!p) return;
      pending.delete(data.id);
      if (data.type === 'result') p.resolve(data.vectors);
      else p.reject(new Error(data.message));
    };
  }
  return worker;
}

export function embed(texts, onProgress) {
  if (embeddingsBroken) return Promise.reject(embeddingsBroken);
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    getWorker().postMessage({ id, texts });
  }).catch((err) => {
    embeddingsBroken = err;
    throw err;
  });
}

// ---------- Chunking ----------
export function chunkPages(pages) {
  const chunks = [];
  for (const p of pages) {
    const text = p.text.replace(/[ \t]+/g, ' ');
    if (text.trim().length < 20) continue;
    let start = 0;
    while (start < text.length) {
      let end = Math.min(text.length, start + CHUNK);
      const nl = text.lastIndexOf('\n', end);
      if (end < text.length && nl > start + CHUNK / 2) end = nl; // prefer breaking at a line end
      const piece = text.slice(start, end).trim();
      if (piece.length >= 20) chunks.push({ page: p.page, text: piece });
      if (end >= text.length) break;
      start = Math.max(start + 1, end - OVERLAP);
    }
  }
  return chunks;
}

// ---------- Ingestion ----------
export async function ingest(userId, file, { password, onStage } = {}) {
  const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
  onStage?.({ stage: 'parsing', progress: 0 });
  const pages = isPdf ? await extractPdf(file, { password, onProgress: (p) => onStage?.({ stage: 'parsing', progress: p }) }) : await extractText(file);
  const textLength = pages.reduce((s, p) => s + p.text.length, 0);
  if (textLength < 40) throw new Error(isPdf ? 'No selectable text found. Scanned/image PDFs need OCR, which is not supported yet.' : 'The file is empty');

  const statement = looksLikeStatement(pages) ? extractTransactions(pages) : [];
  const summary = statement.length >= 3 ? summarise(statement) : null;
  const chunks = chunkPages(pages);
  if (summary) chunks.unshift({ page: null, text: `STATEMENT SUMMARY (computed locally)\n${summary.text}` });

  onStage?.({ stage: 'embedding', progress: 0 });
  let vectors = null;
  try {
    vectors = await embed(chunks.map((c) => c.text), (p) => p.total && onStage?.({ stage: 'embedding', progress: p.done / p.total }));
  } catch (err) {
    console.warn('Embeddings unavailable, falling back to keyword search:', err.message);
  }

  const id = crypto.randomUUID();
  const doc = {
    key: `${userId}:${id}`, id, userId, name: file.name, size: file.size, pages: pages.length, chunks: chunks.length,
    kind: summary ? 'statement' : 'document', addedAt: new Date().toISOString(), embedded: Boolean(vectors),
    statement: summary ? { summary, transactions: statement } : null,
    preview: pages[0]?.text.slice(0, 400) || '',
  };
  await tx('chunks', 'readwrite', (s) => chunks.forEach((c, i) => s.put({ key: `${userId}:${id}:${i}`, userId, docId: id, docName: file.name, i, page: c.page, text: c.text, vector: vectors?.[i] || null })));
  await tx('docs', 'readwrite', (s) => s.put(doc));
  onStage?.({ stage: 'done', progress: 1 });
  return doc;
}

// ---------- Retrieval ----------
const tokenize = (s) => s.toLowerCase().normalize('NFKD').match(/[a-z0-9₹$.]{2,}/g) || [];
const STOP = new Set('the and for with that this from are was were has have had not but you your our their its can will what which who how why when where into over under about than then them they his her she him also any all may per'.split(' '));

function bm25(chunks, query) {
  const q = tokenize(query).filter((t) => !STOP.has(t));
  const docs = chunks.map((c) => tokenize(c.text));
  const avg = docs.reduce((s, d) => s + d.length, 0) / Math.max(1, docs.length);
  const df = new Map();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) || 0) + 1);
  return docs.map((d) => {
    const tf = new Map();
    for (const t of d) tf.set(t, (tf.get(t) || 0) + 1);
    let score = 0;
    for (const t of q) {
      const f = tf.get(t);
      if (!f) continue;
      const idf = Math.log(1 + (docs.length - df.get(t) + 0.5) / (df.get(t) + 0.5));
      score += idf * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (d.length / avg))));
    }
    return score;
  });
}

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

/** Hybrid search over the user's documents. Returns top-k chunks with scores. */
export async function search(userId, query, { k = 5, docId } = {}) {
  let chunks = await allForUser('chunks', userId);
  if (docId) chunks = chunks.filter((c) => c.docId === docId);
  if (!chunks.length) return [];
  const lex = bm25(chunks, query);
  let sem = null;
  if (chunks.some((c) => c.vector)) {
    try {
      const [qv] = await embed([query]);
      sem = chunks.map((c) => (c.vector ? dot(qv, c.vector) : 0));
    } catch {
      sem = null;
    }
  }
  const rank = (scores) => {
    const order = scores.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]);
    const r = new Array(scores.length);
    order.forEach(([, i], pos) => (r[i] = pos));
    return r;
  };
  const rl = rank(lex);
  const rs = sem ? rank(sem) : null;
  const fused = chunks.map((c, i) => ({
    ...c, vector: undefined,
    lexical: lex[i], semantic: sem ? sem[i] : null,
    score: 1 / (60 + rl[i]) + (rs ? 1 / (60 + rs[i]) : 0) + (lex[i] === 0 && (!sem || sem[i] < 0.2) ? -1 : 0),
  }));
  return fused.filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}

export async function hasDocuments(userId) {
  return (await listDocs(userId)).length > 0;
}
