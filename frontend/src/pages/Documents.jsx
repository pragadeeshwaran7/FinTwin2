import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Cpu, FileText, Landmark, Loader2, Lock, Search, Send, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import Markdown from '../components/Markdown';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Notice, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { deleteDoc, ingest, listDocs, search } from '../lib/rag';
import { cn, inr, longDate } from '../lib/format';

const STAGES = { parsing: 'Reading the file in your browser', embedding: 'Building the semantic index (on-device AI model)', done: 'Done' };

function StatementPanel({ doc, onImported }) {
  const s = doc.statement.summary;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const importTxns = async () => {
    setBusy(true);
    try {
      const rows = doc.statement.transactions.map(({ date, description, amount, type, category }) => ({ date, description, amount, type, category, account: doc.name.replace(/\.pdf$/i, '') }));
      const r = await api('/transactions/import', { method: 'POST', body: { filename: doc.name, rows, commit: true } });
      setMsg({ tone: 'success', text: `Imported ${r.imported} transactions${r.duplicates ? ` (${r.duplicates} duplicates skipped)` : ''}. They now appear in your dashboard.` });
      onImported?.();
    } catch (err) {
      setMsg({ tone: 'danger', text: err.message });
    } finally {
      setBusy(false);
    }
  };
  const max = Math.max(...s.categories.map((c) => c.amount), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {[['Money in', s.income, 'text-success'], ['Money out', s.spend, ''], ['Net', s.net, s.net >= 0 ? 'text-success' : 'text-danger'], ['Closing balance', s.closingBalance, '']].map(([l, v, c]) => (
          <div key={l} className="rounded-lg bg-muted/60 p-3"><div className="text-xs text-muted-foreground">{l}</div><div className={cn('tabular text-sm font-semibold', c)}>{v === null ? '—' : inr(v)}</div></div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{s.count} transactions from {longDate(s.from)} to {longDate(s.to)} · {s.verified} verified against the running balance</p>
      <div className="space-y-2">
        {s.categories.slice(0, 6).map((c) => (
          <div key={c.category}>
            <div className="flex justify-between text-xs"><span>{c.category}</span><span className="tabular text-muted-foreground">{inr(c.amount)}</span></div>
            <div className="mt-0.5 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full" style={{ width: `${(c.amount / max) * 100}%`, background: 'var(--series-1)' }} /></div>
          </div>
        ))}
      </div>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : <Button icon={Landmark} onClick={importTxns} loading={busy}>Import {s.count} transactions to my dashboard</Button>}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Preview extracted transactions</summary>
        <table className="mt-2 w-full">
          <tbody className="divide-y divide-border">
            {doc.statement.transactions.slice(0, 25).map((t, i) => (
              <tr key={i}><td className="py-1 pr-2 text-muted-foreground">{t.date}</td><td className="max-w-[220px] truncate py-1 pr-2">{t.description}</td><td className="py-1 pr-2">{t.category}</td><td className={cn('tabular py-1 text-right', t.amount > 0 && 'text-success')}>{inr(t.amount)}</td><td className="pl-1">{t.verified && <CheckCircle2 className="h-3 w-3 text-success" />}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function AskPanel({ userId, doc }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [hits, setHits] = useState([]);

  const ask = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setAnswer(null);
    try {
      const found = await search(userId, q, { k: 6, docId: doc?.id });
      setHits(found);
      const analysis = doc?.statement?.summary?.text;
      const { data } = await api('/chat', { method: 'POST', body: { message: q, context: { documents: found.map((h) => ({ title: h.docName, page: h.page, text: h.text })), analysis } } });
      setAnswer(data);
    } catch (err) {
      setAnswer({ reply: `Could not answer: ${err.message}`, error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title={doc ? `Ask about ${doc.name}` : 'Ask across all your documents'} subtitle="Retrieval runs in your browser; only the top passages are sent to the AI" />
      <form onSubmit={ask} className="flex gap-2 px-5 pt-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={doc?.kind === 'statement' ? 'e.g. How much did I spend on food? What was my largest payment?' : 'e.g. What are the key risks mentioned? Summarise page 3.'} />
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0" loading={busy} aria-label="Ask"><Send className="h-4 w-4" /></Button>
      </form>
      <div className="space-y-4 p-5">
        {answer && (
          <div className={cn('rounded-xl px-4 py-3', answer.error ? 'bg-danger/10 text-danger' : 'bg-muted')}>
            <Markdown text={answer.reply} />
            {answer.source && <p className="mt-2 text-[11px] text-muted-foreground">{answer.source === 'gemini' ? 'Gemini, grounded on retrieved passages' : 'Rule engine (LLM unavailable)'}</p>}
          </div>
        )}
        {hits.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Retrieved passages</p>
            <ol className="space-y-2">
              {hits.map((h, i) => (
                <li key={h.key} className="rounded-lg border border-border p-3 text-xs">
                  <div className="mb-1 flex justify-between gap-2 text-muted-foreground"><span className="font-medium text-foreground">[{i + 1}] {h.docName}{h.page ? `, p.${h.page}` : ''}</span><span>{h.semantic !== null ? `semantic ${h.semantic.toFixed(2)} · ` : ''}keyword {h.lexical.toFixed(1)}</span></div>
                  <p className="line-clamp-4 whitespace-pre-wrap leading-relaxed text-muted-foreground">{h.text}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [needPassword, setNeedPassword] = useState(null);
  const [password, setPassword] = useState('');
  const input = useRef(null);

  const refresh = useCallback(async () => setDocs(await listDocs(user.id)), [user.id]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = async (file, pw) => {
    setError('');
    if (file.size > 40 * 1024 * 1024) return setError('File is larger than 40 MB');
    if (!/\.(pdf|txt|md|csv)$/i.test(file.name)) return setError('Supported: PDF, TXT, MD, CSV');
    setProgress({ name: file.name, stage: 'parsing', progress: 0 });
    try {
      const doc = await ingest(user.id, file, { password: pw, onStage: (s) => setProgress({ name: file.name, ...s }) });
      setNeedPassword(null);
      setPassword('');
      await refresh();
      setSelected(doc.id);
    } catch (err) {
      if (err.needsPassword) setNeedPassword(file);
      setError(err.message);
    } finally {
      setProgress(null);
    }
  };
  const remove = async (id) => {
    await deleteDoc(user.id, id);
    if (selected === id) setSelected(null);
    refresh();
  };
  const doc = docs.find((d) => d.id === selected);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Documents" subtitle="Bank statements, contract notes, annual reports: analysed privately in your browser and searchable by the AI assistant" />
      <Notice tone="success" icon={Lock} className="mb-6">
        Files never leave this device. Parsing, transaction extraction, chunking and embeddings (all-MiniLM-L6-v2, running locally) happen in your browser and are stored in this browser for your account only. When you ask a question, only the few most relevant passages are sent to the AI.
      </Notice>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4">
          <Card className="p-5">
            <button onClick={() => input.current?.click()} disabled={Boolean(progress)} className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-4 py-8 text-center transition hover:border-primary/50 hover:bg-muted/40 disabled:opacity-60"
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.dataTransfer.files[0] && add(e.dataTransfer.files[0]); }}>
              <UploadCloud className="mb-2 h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Add a PDF or text document</span>
              <span className="mt-1 text-xs text-muted-foreground">Statements are detected automatically</span>
            </button>
            <input ref={input} type="file" accept=".pdf,.txt,.md,.csv,application/pdf" className="hidden" onChange={(e) => { e.target.files[0] && add(e.target.files[0]); e.target.value = ''; }} />
            {progress && (
              <div className="mt-4 text-xs">
                <div className="flex items-center gap-2 font-medium"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {progress.name}</div>
                <p className="mt-1 text-muted-foreground">{STAGES[progress.stage]}{progress.stage === 'embedding' && progress.progress === 0 ? ' (first time: downloading the ~23 MB model)…' : '…'}</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${Math.round((progress.progress || 0) * 100)}%` }} /></div>
              </div>
            )}
            {error && <Notice tone="danger" className="mt-4">{error}</Notice>}
            {needPassword && (
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(needPassword, password); }}>
                <Input type="password" placeholder="PDF password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button type="submit">Open</Button>
              </form>
            )}
          </Card>
          <Card>
            <CardHeader title={`Your documents (${docs.length})`} />
            {docs.length === 0 ? <EmptyState icon={FileText} title="No documents yet" description="Try a bank statement PDF: transactions are extracted and can be imported in one click." /> : (
              <ul className="divide-y divide-border px-3 pb-2 pt-2">
                {docs.map((d) => (
                  <li key={d.id}>
                    <div className={cn('flex items-center gap-2 rounded-lg px-2 py-2.5', selected === d.id && 'bg-primary/5')}>
                      <button onClick={() => setSelected(d.id === selected ? null : d.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        {d.kind === 'statement' ? <Landmark className="h-4 w-4 shrink-0 text-primary" /> : <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{d.name}</span>
                          <span className="block text-xs text-muted-foreground">{d.pages} pages · {d.chunks} chunks · {d.embedded ? 'semantic + keyword' : 'keyword only'}</span>
                        </span>
                      </button>
                      {d.kind === 'statement' && <Badge tone="primary">Statement</Badge>}
                      <button onClick={() => remove(d.id)} className="rounded p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger" aria-label={`Delete ${d.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6 xl:col-span-2">
          {doc?.statement && (
            <Card>
              <CardHeader title="Statement analysis" subtitle="Computed entirely in your browser" action={<Cpu className="h-4 w-4 text-muted-foreground" />} />
              <div className="p-5"><StatementPanel doc={doc} /></div>
            </Card>
          )}
          {doc && !doc.statement && (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><Search className="h-4 w-4 text-primary" /> {doc.name}</div>
              <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{doc.preview}</p>
            </Card>
          )}
          {docs.length > 0 ? <AskPanel userId={user.id} doc={doc} /> : (
            <Card><EmptyState icon={ShieldCheck} title="Private document Q&A" description="Upload a document to ask questions like “What fees did my bank charge?” or “What does this annual report say about debt?”, with citations to the exact passage." /></Card>
          )}
        </div>
      </div>
    </div>
  );
}
