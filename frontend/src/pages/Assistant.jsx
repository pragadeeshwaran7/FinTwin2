import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, ExternalLink, FileText, Lightbulb, Loader2, RotateCcw, Send, ShieldAlert, Sparkles, User } from 'lucide-react';
import Markdown from '../components/Markdown';
import { Badge, Button, Card } from '../components/ui';
import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useAuth, userKey } from '../lib/auth';
import { hasDocuments, search } from '../lib/rag';
import { cn, inr, money, pct } from '../lib/format';

const SUGGESTIONS = [
  { group: 'Your money', items: ['Where did most of my money go this month?', 'Summarise my uploaded bank statement', 'How can I save ₹5,000 more a month?'] },
  { group: 'Markets', items: ['How is Apple doing today?', 'What stocks should I consider in India right now?', 'What is the turbulence risk for NIFTY?'] },
];

function loadHistory(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function IdeasCard({ data }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 sm:col-span-2">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Lightbulb className="h-3.5 w-3.5" /> Ideas screen (not advice)</div>
      {data.map((i) => (
        <div key={i.ticker} className="flex items-center justify-between gap-2 py-1 text-xs">
          <span className="font-medium">{i.ticker}</span>
          <span className="truncate text-muted-foreground">{i.reasons.slice(0, 2).join(', ')}</span>
          <span className={cn('shrink-0 font-medium', i.signal === 'consider' ? 'text-success' : i.signal === 'avoid' ? 'text-danger' : 'text-muted-foreground')}>{i.signal}</span>
        </div>
      ))}
    </div>
  );
}

function QuoteCard({ data }) {
  const up = data.change >= 0;
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{data.name}</div>
          <div className="tabular text-lg font-semibold">{money(data.price, data.currency)}</div>
        </div>
        <span className={cn('tabular text-sm font-medium', up ? 'text-success' : 'text-danger')}>{pct(data.changePercent, 2)}</span>
      </div>
      {data.news?.slice(0, 2).map((n) => (
        <a key={n.link} href={n.link} target="_blank" rel="noreferrer" className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground hover:text-primary">
          <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="line-clamp-2">{n.title}</span>
        </a>
      ))}
    </div>
  );
}

function RiskCard({ data }) {
  const tone = data.level === 'high' ? 'danger' : data.level === 'elevated' ? 'warning' : 'success';
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Crash risk · {data.ticker.replace('^', '')}</span>
        <Badge tone={tone} className="capitalize"><ShieldAlert className="h-3 w-3" /> {data.level}</Badge>
      </div>
      <div className="mt-1 text-lg font-semibold tabular">{Math.round(data.risk_index * 100)} / 100</div>
    </div>
  );
}

function CategoryCard({ data }) {
  const max = Math.max(...data.map((c) => c.amount), 1);
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-2 text-xs text-muted-foreground">Top categories (30 days)</div>
      {data.slice(0, 4).map((c) => (
        <div key={c.category} className="mb-1.5">
          <div className="flex justify-between text-xs">
            <span>{c.category}</span>
            <span className="tabular text-muted-foreground">{inr(c.amount)}</span>
          </div>
          <div className="mt-0.5 h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full" style={{ width: `${(c.amount / max) * 100}%`, background: 'var(--series-1)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const CARDS = { quote: QuoteCard, risk: RiskCard, categories: CategoryCard, ideas: IdeasCard };

export default function Assistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const storageKey = userKey(user, 'chat');
  const status = useApi('/chat/status', { select: (d) => d.llm });
  const [messages, setMessages] = useState(() => loadHistory(storageKey));
  const [docsAvailable, setDocsAvailable] = useState(false);
  const [useDocs, setUseDocs] = useState(true);
  useEffect(() => {
    hasDocuments(user.id).then(setDocsAvailable).catch(() => {});
  }, [user.id]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef(null);
  const sentInitial = useRef(false);
  const lastSource = [...messages].reverse().find((m) => m.source)?.source;
  const engine = lastSource ? (lastSource === 'gemini' ? 'gemini' : 'rules') : status.data;

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
    } catch {
      /* ignore */
    }
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy, storageKey]);

  const send = async (text) => {
    const message = text.trim();
    if (!message || busy) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setInput('');
    setBusy(true);
    try {
      // Client-side RAG: retrieve the most relevant passages from this user's documents in the browser.
      let documents = [];
      if (docsAvailable && useDocs) {
        const hits = await search(user.id, message, { k: 5 }).catch(() => []);
        documents = hits.map((h) => ({ title: h.docName, page: h.page, text: h.text }));
      }
      const { data } = await api('/chat', { method: 'POST', body: { message, history, context: { documents } } });
      setMessages((m) => [...m, { role: 'assistant', content: data.reply, cards: data.cards, source: data.source, citations: data.citations }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `Sorry, I could not answer that: ${err.message}`, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (location.state?.q && !sentInitial.current) {
      sentInitial.current = true;
      send(location.state.q);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col lg:h-[calc(100vh-4rem)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI assistant</h1>
          <p className="mt-1 text-sm text-muted-foreground">Grounded in your transactions, your documents (private, in-browser RAG), live global markets and FinTwin's models</p>
        </div>
        <div className="flex items-center gap-2">
          {docsAvailable && (
            <label className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <input type="checkbox" checked={useDocs} onChange={(e) => setUseDocs(e.target.checked)} className="accent-[rgb(var(--primary))]" /> Use my documents
            </label>
          )}
          {engine && <Badge tone={engine === 'gemini' ? 'primary' : 'neutral'}>{engine === 'gemini' ? 'Gemini' : 'Rule engine'}</Badge>}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setMessages([])}>
              New chat
            </Button>
          )}
        </div>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-2xl py-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">What would you like to know?</h2>
              <p className="mt-1 text-sm text-muted-foreground">I can read your spending, compare periods, check live stock prices and run the risk and forecast models.</p>
              <div className="mt-6 grid gap-4 text-left sm:grid-cols-2">
                {SUGGESTIONS.map((g) => (
                  <div key={g.group}>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{g.group}</p>
                    <div className="space-y-2">
                      {g.items.map((s) => (
                        <button key={s} onClick={() => send(s)} className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition hover:border-primary hover:bg-primary/5">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-3 animate-fade-in', m.role === 'user' && 'flex-row-reverse')}>
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
                {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={cn('max-w-[85%] space-y-2 sm:max-w-[75%]', m.role === 'user' && 'items-end')}>
                <div className={cn('rounded-2xl px-4 py-2.5', m.role === 'user' ? 'rounded-tr-sm bg-primary text-primary-foreground' : m.error ? 'rounded-tl-sm bg-danger/10 text-danger' : 'rounded-tl-sm bg-muted text-foreground')}>
                  {m.role === 'user' ? <p className="whitespace-pre-wrap text-sm">{m.content}</p> : <Markdown text={m.content} />}
                </div>
                {m.cards?.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {m.cards.map((c, j) => {
                      const C = CARDS[c.type];
                      return C ? <C key={j} data={c.data} /> : null;
                    })}
                  </div>
                )}
                {m.citations?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.citations.map((c) => (
                      <span key={c.n} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"><FileText className="h-3 w-3" /> [{c.n}] {c.title}{c.page ? ` p.${c.page}` : ''}</span>
                    ))}
                  </div>
                )}
                {m.source && <p className="text-[11px] text-muted-foreground">{m.source === 'gemini' ? 'Gemini, grounded on FinTwin data' : 'FinTwin rule engine (LLM unavailable)'}</p>}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking your data…
              </div>
            </div>
          )}
          <div ref={bottom} />
        </div>
        <form
          className="flex gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            rows={1}
            className="input h-auto min-h-[40px] resize-none py-2.5"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about your spending, savings, or any NSE stock…"
            maxLength={2000}
          />
          <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={!input.trim() || busy} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
