import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, CheckCircle2, Clock, Landmark, Link2, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { Badge, Button, Card, ErrorState, Notice, PageHeader, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { longDate } from '../lib/format';

const ICON = { broker: Building2, bank: Landmark };

export default function Connections() {
  const [params] = useSearchParams();
  const { data, error, loading, reload } = useApi('/portfolio/connections');
  const [msg, setMsg] = useState(params.get('connected') ? { tone: 'success', text: `Connected ${params.get('connected')}. Sync to import holdings.` } : params.get('error') ? { tone: 'danger', text: `Connection failed: ${params.get('error')}` } : null);
  const [busy, setBusy] = useState('');

  const connect = async (id) => {
    if (id !== 'kite') return;
    try {
      const { url } = await api('/portfolio/connections/kite/login');
      window.location.href = url;
    } catch (err) {
      setMsg({ tone: 'danger', text: err.message });
    }
  };
  const sync = async (id) => {
    setBusy(id);
    try {
      const r = await api(`/portfolio/connections/${id}/sync`, { method: 'POST' });
      setMsg({ tone: 'success', text: `Synced ${r.imported} holdings. See Portfolio → My holdings.` });
      reload();
    } catch (err) {
      setMsg({ tone: 'danger', text: err.message });
    } finally {
      setBusy('');
    }
  };
  const disconnect = async (id) => {
    await api(`/portfolio/connections/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Connected accounts" subtitle="Link brokers and banks to sync holdings, balances and transaction history" />
      <Notice tone="primary" icon={ShieldCheck} className="mb-6">
        FinTwin only ever requests read-only access. Bank data in India flows through RBI-licensed Account Aggregators with your explicit, time-bound consent, which you can revoke at any time. Access tokens are stored encrypted.
      </Notice>
      {msg && <Notice tone={msg.tone} className="mb-4">{msg.text}</Notice>}
      {loading && !data ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((p) => {
            const Icon = ICON[p.kind] || Link2;
            return (
              <Card key={p.id} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5"><Icon className="h-5 w-5 text-primary" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{p.name}</h3>
                      <Badge>{p.region}</Badge>
                      {p.connected ? <Badge tone="success"><CheckCircle2 className="h-3 w-3" /> Connected</Badge> : p.configured ? <Badge tone="primary">Available</Badge> : <Badge tone="warning"><Clock className="h-3 w-3" /> Needs setup</Badge>}
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {p.covers.map((c) => <li key={c} className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{c}</li>)}
                    </ul>
                  </div>
                </div>
                {p.connection && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {p.connection.accountName} ({p.connection.accountId}) · connected {longDate(p.connection.connectedAt)}
                    {p.connection.lastSyncAt ? ` · last sync ${longDate(p.connection.lastSyncAt)}` : ''}
                  </p>
                )}
                {!p.configured && <p className="mt-3 text-xs leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">To enable:</span> {p.needs}</p>}
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {p.connected ? (
                    <>
                      <Button size="sm" icon={RefreshCw} loading={busy === p.id} onClick={() => sync(p.id)}>Sync now</Button>
                      <Button size="sm" variant="outline" icon={Unplug} onClick={() => disconnect(p.id)}>Disconnect</Button>
                    </>
                  ) : (
                    <Button size="sm" icon={Link2} disabled={!p.configured || p.id !== 'kite'} onClick={() => connect(p.id)}>
                      {p.configured ? (p.id === 'kite' ? 'Connect' : 'Integration pending') : 'Not configured'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
