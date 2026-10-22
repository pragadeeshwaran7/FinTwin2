import { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/format';

/** Search any stock, index, ETF, crypto or currency worldwide (Yahoo Finance). */
export default function SymbolSearch({ onSelect, placeholder = 'Search any stock worldwide: Apple, RELIANCE, VOD.L, Toyota, BTC…', className, autoFocus }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef(null);

  useEffect(() => {
    if (q.trim().length < 1) return setResults([]);
    let cancelled = false;
    setBusy(true);
    const t = setTimeout(() => {
      api('/markets/search', { query: { q } })
        .then((d) => !cancelled && (setResults(d.data), setActive(0)))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setBusy(false));
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (r) => {
    onSelect(r);
    setQ('');
    setOpen(false);
  };

  return (
    <div ref={box} className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        className="input pl-9 pr-9"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(results.length - 1, a + 1));
          else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1));
          else if (e.key === 'Enter' && results[active]) {
            e.preventDefault();
            choose(results[active]);
          } else if (e.key === 'Enter' && /^[A-Za-z0-9^=.\-&]{1,25}$/.test(q.trim())) choose({ symbol: q.trim().toUpperCase(), name: q.trim().toUpperCase() });
          else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {busy && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      {open && q && (results.length > 0 || !busy) && (
        <ul className="absolute z-40 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg" role="listbox">
          {results.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">No matches. Press Enter to try “{q.toUpperCase()}” as a symbol.</li>}
          {results.map((r, i) => (
            <li key={r.symbol} role="option" aria-selected={i === active}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                onMouseEnter={() => setActive(i)}
                className={cn('flex w-full items-center justify-between gap-3 px-3 py-2 text-left', i === active && 'bg-muted')}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{r.symbol}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.name}</span>
                </span>
                <span className="shrink-0 text-right text-[11px] text-muted-foreground">
                  {r.exchange}
                  <br />
                  {r.type?.toLowerCase()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
