import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Filter, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, Notice, PageHeader, Select, Skeleton } from '../components/ui';
import { api, downloadFile } from '../lib/api';
import { useApi } from '../lib/useApi';
import { cn, inr, longDate } from '../lib/format';

const RANGE_OPTIONS = [
  { value: 'all', label: 'All time' }, { value: '30d', label: 'Last 30 days' }, { value: '90d', label: 'Last 90 days' },
  { value: '6m', label: 'Last 6 months' }, { value: '1y', label: 'Last year' },
];
const TYPE_OPTIONS = [{ value: 'all', label: 'All types' }, { value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfers & investments' }];
const TYPE_TONE = { income: 'success', expense: 'neutral', transfer: 'primary' };

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function TransactionForm({ initial, categories, accounts, onClose, onSaved }) {
  const [form, setForm] = useState(
    initial
      ? { ...initial, amount: Math.abs(initial.amount) }
      : { date: new Date().toISOString().slice(0, 10), description: '', category: 'Food', subcategory: '', amount: '', type: 'expense', account: accounts[0] || 'Cash' },
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { ...form, amount: Number(form.amount) };
      if (initial) await api(`/transactions/${initial.id}`, { method: 'PUT', body });
      else await api('/transactions', { method: 'POST', body });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? 'Edit transaction' : 'Add transaction'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="txn-form" loading={busy}>{initial ? 'Save changes' : 'Add transaction'}</Button>
        </>
      }
    >
      <form id="txn-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {error && <Notice tone="danger" className="sm:col-span-2">{error}</Notice>}
        <Field label="Type">
          <Select value={form.type} onChange={set('type')} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfer / investment' }]} />
        </Field>
        <Field label="Amount (₹)">
          <Input type="number" min="0.01" step="0.01" required value={form.amount} onChange={set('amount')} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Input required value={form.description} onChange={set('description')} placeholder="e.g. Swiggy order" />
        </Field>
        <Field label="Category">
          <Input list="txn-categories" required value={form.category} onChange={set('category')} />
          <datalist id="txn-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Subcategory (optional)">
          <Input value={form.subcategory} onChange={set('subcategory')} />
        </Field>
        <Field label="Date">
          <Input type="date" required value={form.date} onChange={set('date')} />
        </Field>
        <Field label="Account">
          <Input list="txn-accounts" value={form.account} onChange={set('account')} />
          <datalist id="txn-accounts">{accounts.map((a) => <option key={a} value={a} />)}</datalist>
        </Field>
      </form>
    </Modal>
  );
}

function SortHeader({ label, field, sort, setSort, className }) {
  const active = sort.by === field;
  return (
    <th className={cn('px-4 py-3 font-medium', className)}>
      <button
        className={cn('inline-flex items-center gap-1 hover:text-foreground', active && 'text-foreground')}
        onClick={() => setSort({ by: field, dir: active && sort.dir === 'desc' ? 'asc' : 'desc' })}
      >
        {label}
        {active && (sort.dir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </th>
  );
}

export default function Transactions() {
  const [filters, setFilters] = useState({ search: '', range: 'all', type: 'all', category: '', account: 'all' });
  const [sort, setSort] = useState({ by: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const search = useDebounced(filters.search);
  const meta = useApi('/transactions/meta', { select: (d) => d });

  const query = useMemo(
    () => ({ search, range: filters.range === 'all' ? undefined : filters.range, type: filters.type, category: filters.category, account: filters.account, sortBy: sort.by, sortDir: sort.dir, page, pageSize: 25 }),
    [search, filters.range, filters.type, filters.category, filters.account, sort, page],
  );
  const list = useApi('/transactions', { query, select: (d) => d });
  useEffect(() => setPage(1), [search, filters.range, filters.type, filters.category, filters.account]);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const activeFilters = ['range', 'type', 'account'].filter((k) => filters[k] !== 'all').length + (filters.category ? 1 : 0);
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;
  const refresh = () => {
    list.reload();
    meta.reload();
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.description}" (${inr(Math.abs(t.amount))})?`)) return;
    await api(`/transactions/${t.id}`, { method: 'DELETE' });
    refresh();
  };

  const exportCsv = () => {
    const { page: _p, pageSize: _s, sortBy: _b, sortDir: _d, ...rest } = query;
    downloadFile('/transactions/export', rest, 'fintwin-transactions.csv').catch((e) => alert(e.message));
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Transactions"
        subtitle={meta.data ? `${meta.data.count.toLocaleString('en-IN')} transactions${meta.data.firstDate ? ` from ${longDate(meta.data.firstDate)} to ${longDate(meta.data.lastDate)}` : ''}` : ' '}
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={exportCsv}>Export CSV</Button>
            <Button icon={Plus} onClick={() => setEditing({})}>Add</Button>
          </>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={filters.search} onChange={set('search')} placeholder="Search description, category or account" />
          </div>
          <Button variant="outline" icon={Filter} className="lg:hidden" onClick={() => setShowFilters((s) => !s)}>
            Filters {activeFilters > 0 && <Badge tone="primary">{activeFilters}</Badge>}
          </Button>
          <div className={cn('grid gap-3 sm:grid-cols-2 lg:flex', showFilters ? 'grid' : 'hidden lg:flex')}>
            <Select className="lg:w-40" value={filters.range} onChange={set('range')} options={RANGE_OPTIONS} />
            <Select className="lg:w-48" value={filters.type} onChange={set('type')} options={TYPE_OPTIONS} />
            <Select className="lg:w-44" value={filters.category} onChange={set('category')} options={[{ value: '', label: 'All categories' }, ...(meta.data?.categories || [])]} />
            <Select className="lg:w-44" value={filters.account} onChange={set('account')} options={[{ value: 'all', label: 'All accounts' }, ...(meta.data?.accounts || [])]} />
          </div>
          {(activeFilters > 0 || filters.search) && (
            <Button variant="ghost" size="sm" icon={X} onClick={() => setFilters({ search: '', range: 'all', type: 'all', category: '', account: 'all' })}>
              Clear
            </Button>
          )}
        </div>
        {list.data && (
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">{list.data.total.toLocaleString('en-IN')}</span> matching</span>
            <span>Income <span className="tabular font-medium text-success">{inr(list.data.totals.totalIncome)}</span></span>
            <span>Expenses <span className="tabular font-medium text-foreground">{inr(list.data.totals.totalExpenses)}</span></span>
            <span>Net <span className={cn('tabular font-medium', list.data.totals.netIncome >= 0 ? 'text-success' : 'text-danger')}>{inr(list.data.totals.netIncome)}</span></span>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        {list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.data && list.data.total === 0 ? (
          <EmptyState title="No transactions found" description={meta.data?.count ? 'Try changing your filters.' : 'Upload a CSV to get started.'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <SortHeader label="Date" field="date" sort={sort} setSort={setSort} />
                    <SortHeader label="Description" field="description" sort={sort} setSort={setSort} />
                    <SortHeader label="Category" field="category" sort={sort} setSort={setSort} />
                    <th className="px-4 py-3 font-medium">Account</th>
                    <SortHeader label="Amount" field="amount" sort={sort} setSort={setSort} className="text-right" />
                    <th className="w-20 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!list.data
                    ? Array.from({ length: 8 }, (_, i) => (
                        <tr key={i}>
                          <td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                        </tr>
                      ))
                    : list.data.data.map((t) => (
                        <tr key={t.id} className={cn('group hover:bg-muted/40', list.loading && 'opacity-60')}>
                          <td className="tabular whitespace-nowrap px-4 py-3 text-muted-foreground">{longDate(t.date)}</td>
                          <td className="max-w-xs px-4 py-3">
                            <div className="truncate font-medium">{t.description}</div>
                            {t.subcategory && <div className="truncate text-xs text-muted-foreground">{t.subcategory}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={TYPE_TONE[t.type]}>{t.category}</Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{t.account}</td>
                          <td className={cn('tabular whitespace-nowrap px-4 py-3 text-right font-semibold', t.type === 'income' ? 'text-success' : t.type === 'transfer' ? 'text-muted-foreground' : '')}>
                            {t.type === 'income' ? '+' : '−'}
                            {inr(Math.abs(t.amount), true)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
                              <button onClick={() => setEditing(t)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => remove(t)} className="rounded p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger" aria-label="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            {list.data && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <span>
                  {((list.data.page - 1) * list.data.pageSize + 1).toLocaleString('en-IN')}–{Math.min(list.data.page * list.data.pageSize, list.data.total).toLocaleString('en-IN')} of {list.data.total.toLocaleString('en-IN')}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Next page">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {editing && (
        <TransactionForm
          initial={editing.id ? editing : null}
          categories={meta.data?.categories || []}
          accounts={meta.data?.accounts || []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
