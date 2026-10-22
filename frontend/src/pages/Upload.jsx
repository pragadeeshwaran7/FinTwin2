import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Database, FileSpreadsheet, FileUp, Info, Sparkles, Trash2, UploadCloud } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Notice, PageHeader } from '../components/ui';
import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { cn, inr, longDate } from '../lib/format';
import { extractPdf } from '../lib/rag/pdf';
import { extractTransactions } from '../lib/rag/statement';

const MAX_BYTES = 12 * 1024 * 1024;
const FIELD_LABELS = { date: 'Date', description: 'Description', amount: 'Amount', withdrawal: 'Withdrawal', deposit: 'Deposit', type: 'Type', category: 'Category', subcategory: 'Subcategory', account: 'Account' };

function Dropzone({ onFile, disabled }) {
  const [drag, setDrag] = useState(false);
  const input = useRef(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
      }}
      onClick={() => !disabled && input.current?.click()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition',
        drag ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <div className="mb-3 rounded-full bg-primary/10 p-3">
        <UploadCloud className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm font-medium">Drop a CSV file here, or click to browse</p>
      <p className="mt-1 text-xs text-muted-foreground">CSV exports or PDF bank statements (parsed privately in your browser), up to 12 MB</p>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv,.pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files[0]) onFile(e.target.files[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function Upload() {
  const location = useLocation();
  const history = useApi('/transactions/uploads');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const pick = async (f) => {
    setError('');
    setDone(null);
    setPreview(null);
    if (!/\.(csv|pdf)$/i.test(f.name)) return setError('Please choose a .csv or .pdf file');
    if (f.size > MAX_BYTES) return setError('File is larger than 12 MB');
    setBusy('preview');
    try {
      let body;
      if (/\.pdf$/i.test(f.name)) {
        // PDF statements are parsed client-side; only the extracted rows are sent.
        const rows = extractTransactions(await extractPdf(f)).map(({ date, description, amount, type, category }) => ({ date, description, amount, type, category }));
        if (!rows.length) throw new Error('No transactions found in this PDF. For other PDFs (reports, contract notes) use the Documents page.');
        body = { filename: f.name, rows };
      } else {
        body = { filename: f.name, content: await f.text() };
      }
      setFile({ name: f.name, size: f.size, body });
      setPreview(await api('/transactions/import', { method: 'POST', body }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const commit = async () => {
    setBusy('import');
    setError('');
    try {
      const res = await api('/transactions/import', { method: 'POST', body: { ...file.body, commit: true } });
      setDone({ imported: res.imported, duplicates: res.duplicates, filename: file.name });
      setPreview(null);
      setFile(null);
      history.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const loadSample = async () => {
    setBusy('sample');
    setError('');
    try {
      const res = await api('/transactions/sample', { method: 'POST' });
      setDone({ imported: res.imported, duplicates: 0, filename: 'Indian household sample dataset' });
      history.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const removeUpload = async (u) => {
    if (!window.confirm(`Remove "${u.filename}" and its ${u.rows} transactions?`)) return;
    try {
      await api(`/transactions/uploads/${u.id}`, { method: 'DELETE' });
      history.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Upload data" subtitle="Import transactions from a CSV. Columns are detected automatically and duplicates are skipped." />
      {location.state?.welcome && !done && (
        <Notice tone="primary" icon={Sparkles} className="mb-4">
          Welcome to FinTwin! Upload your bank statement, or load the sample Indian household dataset to explore right away.
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <Dropzone onFile={pick} disabled={Boolean(busy)} />
            {busy === 'preview' && <p className="mt-3 text-center text-sm text-muted-foreground">Analysing {file?.name}…</p>}
            {error && <Notice tone="danger" className="mt-4">{error}</Notice>}
            {done && (
              <Notice tone="success" icon={CheckCircle2} className="mt-4">
                Imported <strong>{done.imported.toLocaleString('en-IN')}</strong> transactions from {done.filename}
                {done.duplicates ? ` (${done.duplicates} duplicates skipped)` : ''}. <Link to="/dashboard" className="font-semibold underline">Open dashboard</Link>
              </Notice>
            )}
          </Card>

          {preview && (
            <Card className="animate-fade-in">
              <CardHeader
                title={`Preview: ${file.name}`}
                subtitle={`${preview.total.toLocaleString('en-IN')} rows parsed · ${preview.newCount.toLocaleString('en-IN')} new · ${preview.duplicates} duplicates · ${preview.skipped} skipped`}
                action={
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setPreview(null); setFile(null); }}>Cancel</Button>
                    <Button size="sm" icon={FileUp} onClick={commit} loading={busy === 'import'} disabled={!preview.newCount}>
                      Import {preview.newCount.toLocaleString('en-IN')}
                    </Button>
                  </div>
                }
              />
              <div className="px-5 pt-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(preview.columns).map(([field, idx]) => (
                    <Badge key={field} tone="primary">
                      {FIELD_LABELS[field] || field} ← “{preview.headers[idx]}”
                    </Badge>
                  ))}
                </div>
                {preview.errors?.length > 0 && (
                  <Notice tone="warning" className="mt-3">
                    {preview.errors.slice(0, 3).join(' · ')}
                  </Notice>
                )}
                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                  {[['Income', preview.summary.totalIncome, 'text-success'], ['Expenses', preview.summary.totalExpenses, ''], ['Net', preview.summary.netIncome, preview.summary.netIncome >= 0 ? 'text-success' : 'text-danger']].map(([l, v, c]) => (
                    <div key={l} className="rounded-lg bg-muted/60 px-2 py-3">
                      <div className="text-muted-foreground">{l}</div>
                      <div className={cn('tabular mt-0.5 text-sm font-semibold', c)}>{inr(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="border-y border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-5 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.preview.map((t, i) => (
                      <tr key={i}>
                        <td className="tabular whitespace-nowrap px-5 py-2 text-muted-foreground">{t.date}</td>
                        <td className="max-w-[220px] truncate px-3 py-2">{t.description}</td>
                        <td className="px-3 py-2">{t.category}</td>
                        <td className="px-3 py-2 capitalize text-muted-foreground">{t.type}</td>
                        <td className={cn('tabular whitespace-nowrap px-5 py-2 text-right font-medium', t.type === 'income' && 'text-success')}>{inr(t.amount, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-5 py-3 text-xs text-muted-foreground">Showing the first {preview.preview.length} rows.</p>
            </Card>
          )}

          <Card>
            <CardHeader title="Upload history" />
            {history.data?.length ? (
              <ul className="divide-y divide-border px-5 pb-2 pt-2">
                {history.data.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-lg bg-muted p-2">{u.source === 'sample' ? <Database className="h-4 w-4 text-muted-foreground" /> : <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.rows.toLocaleString('en-IN')} transactions · {longDate(u.uploadedAt)}
                          {u.duplicates ? ` · ${u.duplicates} duplicates skipped` : ''}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeUpload(u)} aria-label={`Remove ${u.filename}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No uploads yet" description="Files you import will appear here. Removing an upload deletes its transactions." />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Database className="h-4 w-4 text-primary" /> Try the sample dataset
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              2,461 real transactions from an Indian household (food, transport, rent, salary, SIPs and more), with dates shifted to end yesterday.
            </p>
            <Button className="mt-4 w-full" variant="subtle" icon={Sparkles} onClick={loadSample} loading={busy === 'sample'}>
              Load sample data
            </Button>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4 text-primary" /> Supported formats
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><span className="font-medium text-foreground">PDF statements:</span> text-based PDFs from most Indian banks. Debits and credits are checked against the running balance. Password-protected or scanned PDFs: use the Documents page.</li>
              <li><span className="font-medium text-foreground">Required (CSV):</span> a date column and either an amount column or withdrawal + deposit columns.</li>
              <li><span className="font-medium text-foreground">Optional:</span> description / narration / note, category, subcategory, type (income/expense, debit/credit), account / mode.</li>
              <li><span className="font-medium text-foreground">Dates:</span> YYYY-MM-DD, DD/MM/YYYY or MM/DD/YYYY (detected from the data).</li>
              <li><span className="font-medium text-foreground">Smart categories:</span> missing categories are inferred (Swiggy → Food, Uber → Transportation…).</li>
              <li>Investments (SIP, mutual funds, PPF, FD) are tracked as transfers, not spending.</li>
            </ul>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
{`Date,Description,Amount,Category
2026-10-01,Salary credit,85000,Salary
2026-10-02,Swiggy order,-420,Food
2026-10-03,Metro card,-500,Transportation`}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  );
}
