import { Link } from 'react-router-dom';
import { ArrowRight, Atom, Brain, CheckCircle2, FlaskConical, GitBranch, Lightbulb, LineChart, PiggyBank, Scale, ShieldAlert, XCircle } from 'lucide-react';
import { Badge, Card, ErrorState, Notice, PageHeader, Spinner } from '../components/ui';
import { useApi } from '../lib/useApi';

const ICONS = { crash_risk: ShieldAlert, forecast: LineChart, optimize: Atom, savings: PiggyBank, ideas: Lightbulb };
const STATUS = { validated: ['success', 'Validated'], experimental: ['warning', 'Experimental'], 'rule-based': ['neutral', 'Rule-based'] };

export default function Models() {
  const { data, error, loading, reload } = useApi('/ml/models');
  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const rt = data.runtime;
  return (
    <div className="animate-fade-in">
      <PageHeader title="Models" subtitle="Every model, how accurate it really is out-of-sample, and where it came from" />
      <Card className="mb-6 flex flex-wrap items-center gap-3 p-4">
        {rt.ok ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-danger" />}
        <div className="flex-1">
          <p className="text-sm font-medium">Python ML runtime {rt.ok ? 'ready' : 'unavailable'}</p>
          <p className="text-xs text-muted-foreground">{rt.ok ? `numpy ${rt.numpy} · pandas ${rt.pandas} · scikit-learn ${rt.sklearn} · scipy ${rt.scipy}` : rt.error}</p>
        </div>
        {!rt.ok && <Notice tone="warning">Run <code>pip install -r ml/requirements.txt</code> and restart the backend.</Notice>}
      </Card>
      <Notice icon={Scale} className="mb-6">
        Accuracy figures are walk-forward or held-out tests on data each model never saw (scripts in <code>ml/experiments/</code>). Models that could not beat a simple baseline were replaced, not hidden.
      </Notice>
      <div className="grid gap-6 md:grid-cols-2">
        {data.models.map((m) => {
          const Icon = ICONS[m.key] || Brain;
          const [tone, label] = STATUS[m.status] || ['neutral', m.status];
          return (
            <Card key={m.key} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5"><Icon className="h-5 w-5 text-primary" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{m.name}</h3><Badge tone={tone}>{label}</Badge></div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
                  <div className="mt-3 flex gap-2 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed"><FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span>{m.accuracy}</span></div>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4 text-xs">
                <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground"><GitBranch className="h-3.5 w-3.5 shrink-0" /><span className="line-clamp-2">{m.origin}</span></span>
                <Link to={m.page} className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline">Open <ArrowRight className="h-3 w-3" /></Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
