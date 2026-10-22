// PDF text extraction in the browser (pdf.js). Rebuilds text lines from glyph
// positions so tabular bank statements keep one transaction per line.
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPdf(file, { password, onProgress } = {}) {
  const data = new Uint8Array(await file.arrayBuffer());
  let doc;
  try {
    doc = await pdfjs.getDocument({ data, password, isEvalSupported: false }).promise;
  } catch (err) {
    if (err?.name === 'PasswordException') {
      const e = new Error(password ? 'Incorrect PDF password' : 'This PDF is password-protected');
      e.needsPassword = true;
      throw e;
    }
    throw err;
  }
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Group text items into lines by their y coordinate, then order by x.
    const rows = new Map();
    for (const item of content.items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5] / 2) * 2;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push({ x: item.transform[4], s: item.str, w: item.width });
    }
    const lines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => {
        items.sort((a, b) => a.x - b.x);
        let line = '';
        let lastEnd = null;
        for (const it of items) {
          if (lastEnd !== null) line += it.x - lastEnd > 12 ? '  |  ' : it.x - lastEnd > 1.5 ? ' ' : '';
          line += it.s;
          lastEnd = it.x + it.w;
        }
        return line.replace(/\s+\|\s+$/, '').trim();
      })
      .filter(Boolean);
    pages.push({ page: p, lines, text: lines.join('\n') });
    onProgress?.(p / doc.numPages);
  }
  await doc.destroy();
  return pages;
}

export async function extractText(file) {
  const text = await file.text();
  const lines = text.split(/\r?\n/);
  const pages = [];
  for (let i = 0; i < lines.length; i += 60) pages.push({ page: pages.length + 1, lines: lines.slice(i, i + 60), text: lines.slice(i, i + 60).join('\n') });
  return pages;
}
