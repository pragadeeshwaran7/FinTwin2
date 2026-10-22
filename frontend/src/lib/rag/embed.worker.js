// Web Worker: sentence embeddings in the browser with transformers.js.
// Model: all-MiniLM-L6-v2 (384-d, ~23 MB quantised), downloaded once from
// Hugging Face and cached by the browser. Nothing is sent to any server.
import { env, pipeline } from '@huggingface/transformers';

env.allowLocalModels = false;
let extractor = null;

async function load() {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      dtype: 'q8',
      progress_callback: (p) => {
        if (p.status === 'progress' && p.file?.endsWith('.onnx')) self.postMessage({ type: 'progress', progress: p.progress / 100 });
      },
    });
  }
  return extractor;
}

self.onmessage = async ({ data }) => {
  const { id, texts } = data;
  try {
    const model = await load();
    const out = [];
    for (let i = 0; i < texts.length; i += 16) {
      const batch = texts.slice(i, i + 16);
      const t = await model(batch, { pooling: 'mean', normalize: true });
      const dim = t.dims.at(-1);
      for (let j = 0; j < batch.length; j++) out.push(Array.from(t.data.slice(j * dim, (j + 1) * dim)));
      self.postMessage({ type: 'progress', id, done: Math.min(texts.length, i + 16), total: texts.length });
    }
    self.postMessage({ type: 'result', id, vectors: out });
  } catch (err) {
    self.postMessage({ type: 'error', id, message: err?.message || String(err) });
  }
};
