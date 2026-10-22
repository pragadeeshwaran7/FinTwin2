import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Atom, Brain, KeyRound, LineChart, Lock, PiggyBank, Sparkles } from 'lucide-react';
import { Button, Field, Input, Notice } from '../components/ui';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

const FEATURES = [
  { icon: PiggyBank, title: 'Personal finance twin', text: 'Spending, savings rate and anomalies from your own transactions.' },
  { icon: LineChart, title: 'Every market', text: 'Search any stock worldwide: NSE, NYSE, NASDAQ, LSE, Tokyo and more.' },
  { icon: Atom, title: 'Quantum portfolio optimiser', text: 'QAOA selects the best risk-adjusted basket of stocks.' },
  { icon: Brain, title: 'AI assistant', text: 'Ask questions answered from your data and live market context.' },
];

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
              <path d="M5 22l7-7 5 5 10-10" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-lg font-semibold">FinTwin</span>
        </div>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight">A digital twin of your money and the markets it lives in.</h2>
          <div className="mt-10 grid gap-6">
            {FEATURES.map(({ icon: Icon, title: t, text }) => (
              <div key={t} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="text-sm text-blue-100">{text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-100">
          <Lock className="h-3.5 w-3.5" /> Encrypted at rest (AES-256), optional 2FA, documents analysed in your browser.
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </div>
    </div>
  );
}

function GoogleButton({ onCredential }) {
  const ref = useRef(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;
  const [clientId, setClientId] = useState(null);
  useEffect(() => {
    api('/auth/config').then((c) => setClientId(c.googleClientId)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!clientId || !ref.current) return;
    const init = () => {
      window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => cb.current(r.credential), ux_mode: 'popup' });
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: ref.current.offsetWidth || 360, text: 'continue_with' });
    };
    if (window.google?.accounts?.id) return init();
    const script = Object.assign(document.createElement('script'), { src: 'https://accounts.google.com/gsi/client', async: true, onload: init });
    document.head.appendChild(script);
  }, [clientId]);
  if (!clientId) return null;
  return <div ref={ref} className="flex w-full justify-center" />;
}

export function Login() {
  const { login, verify2fa, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handle = async (promise) => {
    setBusy(true);
    setError('');
    try {
      const d = await promise;
      if (d.twoFactorRequired) {
        setChallenge(d.challenge);
        setCode('');
      } else navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const go = (email, password) => handle(login(email, password));

  if (challenge) {
    return (
      <AuthShell title="Two-factor authentication" subtitle="Enter the 6-digit code from your authenticator app" footer={<button className="font-medium text-primary hover:underline" onClick={() => setChallenge(null)}>Back to sign in</button>}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handle(verify2fa(challenge, code)); }}>
          {error && <Notice tone="danger">{error}</Notice>}
          <Field label="Authentication code">
            <Input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="text-center font-mono text-lg tracking-[0.4em]" />
          </Field>
          <Button type="submit" className="w-full" icon={KeyRound} loading={busy} disabled={code.length !== 6}>Verify</Button>
        </form>
      </AuthShell>
    );
  }

  const useDemo = async () => {
    try {
      const demo = await api('/auth/demo');
      setForm(demo);
      go(demo.email, demo.password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your FinTwin account" footer={<>New to FinTwin? <Link to="/register" className="font-medium text-primary hover:underline">Create an account</Link></>}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          go(form.email, form.password);
        }}
      >
        {error && <Notice tone="danger">{error}</Notice>}
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
        </Field>
        <Button type="submit" className="w-full" loading={busy}>
          Sign in
        </Button>
        <div className="relative py-1 text-center text-xs text-muted-foreground">
          <span className="relative z-10 bg-background px-2">or</span>
          <div className="absolute inset-x-0 top-1/2 border-t border-border" />
        </div>
        <GoogleButton onCredential={(credential) => handle(googleLogin(credential))} />
        <Button type="button" variant="outline" className="w-full" icon={Sparkles} onClick={useDemo} disabled={busy}>
          Explore with the demo account
        </Button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setBusy(true);
    setError('');
    try {
      await register(form.name, form.email, form.password);
      navigate('/upload', { replace: true, state: { welcome: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <AuthShell title="Create your twin" subtitle="Start with your transactions or our sample data" footer={<>Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></>}>
      <form className="space-y-4" onSubmit={submit}>
        {error && <Notice tone="danger">{error}</Notice>}
        <Field label="Full name">
          <Input required autoComplete="name" value={form.name} onChange={set('name')} placeholder="Priya Sharma" />
        </Field>
        <Field label="Email">
          <Input type="email" required autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </Field>
        <Field label="Password" hint="8+ characters with letters and numbers; not a common password">
          <Input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Confirm password">
          <Input type="password" required autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
        </Field>
        <Button type="submit" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
