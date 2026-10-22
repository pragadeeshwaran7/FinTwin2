import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, KeyRound, LogOut, Monitor, ShieldCheck, Smartphone, Trash2, User } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Field, Input, Notice, PageHeader, Spinner } from '../components/ui';
import { api, downloadFile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/useApi';
import { clearUser } from '../lib/rag';
import { longDate } from '../lib/format';

const EVENT_LABELS = {
  login: 'Signed in', login_failed: 'Failed sign-in', logout: 'Signed out', register: 'Account created', password_changed: 'Password changed',
  '2fa_enabled': '2FA turned on', '2fa_disabled': '2FA turned off', '2fa_failed': 'Wrong 2FA code', session_revoked: 'Session revoked',
  sessions_revoked: 'Other sessions signed out', data_exported: 'Data exported', google_linked: 'Google account linked',
  connection_added: 'Account connected', connection_removed: 'Account disconnected', holdings_imported: 'Holdings imported', holdings_synced: 'Holdings synced',
};

function device(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /curl|bun|node/i.test(ua) ? 'API client' : 'Browser';
  const os = /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : '';
  return `${browser}${os ? ` on ${os}` : ''}`;
}
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function TwoFactor() {
  const { user, refreshUser } = useAuth();
  const [setup, setSetup] = useState(null);
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setMsg(null);
    const s = await api('/auth/2fa/setup', { method: 'POST' });
    setSetup(s);
    setQr(await QRCode.toDataURL(s.uri, { margin: 1, width: 180 }));
  };
  const submit = async (path) => {
    setBusy(true);
    setMsg(null);
    try {
      await api(path, { method: 'POST', body: { code } });
      await refreshUser();
      setSetup(null);
      setCode('');
      setMsg({ tone: 'success', text: path.endsWith('enable') ? 'Two-factor authentication is on.' : 'Two-factor authentication is off.' });
    } catch (err) {
      setMsg({ tone: 'danger', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Two-factor authentication" subtitle="Require a code from an authenticator app (Google Authenticator, Authy, 1Password) at sign-in" action={<Badge tone={user.twoFactor ? 'success' : 'neutral'}>{user.twoFactor ? 'On' : 'Off'}</Badge>} />
      <div className="space-y-4 p-5">
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        {!user.twoFactor && !setup && <Button icon={Smartphone} onClick={start}>Set up 2FA</Button>}
        {setup && (
          <div className="grid gap-4 sm:grid-cols-[auto,1fr] sm:items-center">
            {qr && <img src={qr} alt="2FA QR code" className="h-44 w-44 rounded-lg border border-border bg-white p-1" />}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Scan the QR code, or enter this key manually:</p>
              <code className="block break-all rounded bg-muted px-2 py-1.5 font-mono text-xs">{setup.secret}</code>
              <Field label="6-digit code from the app">
                <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="font-mono tracking-widest" />
              </Field>
              <Button onClick={() => submit('/auth/2fa/enable')} loading={busy} disabled={code.length !== 6}>Turn on</Button>
            </div>
          </div>
        )}
        {user.twoFactor && (
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Code to turn 2FA off" className="w-48">
              <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="font-mono tracking-widest" />
            </Field>
            <Button variant="outline" onClick={() => submit('/auth/2fa/disable')} loading={busy} disabled={code.length !== 6}>Turn off</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Settings() {
  const { user, updateProfile, logout, dropSession } = useAuth();
  const sessions = useApi('/auth/sessions');
  const auditLog = useApi('/auth/audit');
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [msg, setMsg] = useState({});
  const [delPw, setDelPw] = useState('');

  const note = (k, tone, text) => setMsg((m) => ({ ...m, [k]: { tone, text } }));
  const changePassword = async (e) => {
    e.preventDefault();
    try {
      const r = await api('/auth/password', { method: 'POST', body: pw });
      setPw({ current: '', next: '' });
      note('pw', 'success', `Password updated. ${r.sessionsRevoked} other session(s) were signed out.`);
      sessions.reload();
    } catch (err) {
      note('pw', 'danger', err.message);
    }
  };
  const revoke = async (id) => {
    await api(`/auth/sessions/${id}`, { method: 'DELETE' });
    sessions.reload();
  };
  const revokeOthers = async () => {
    const r = await api('/auth/sessions/revoke-others', { method: 'POST' });
    note('sessions', 'success', `Signed out of ${r.revoked} other session(s).`);
    sessions.reload();
  };
  const deleteAccount = async () => {
    if (!window.confirm('Permanently delete your account and all data? This cannot be undone.')) return;
    try {
      await api('/auth/me', { method: 'DELETE', body: { password: delPw } });
      await clearUser(user.id).catch(() => {});
      dropSession();
    } catch (err) {
      note('delete', 'danger', err.message);
    }
  };

  useEffect(() => setName(user.name), [user.name]);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings & security" subtitle="Your profile, sign-in security, active sessions and data rights" />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Profile" action={<User className="h-4 w-4 text-muted-foreground" />} />
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3 text-sm">
                {user.picture ? <img src={user.picture} alt="" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" /> : null}
                <div>
                  <div className="font-medium">{user.email}</div>
                  <div className="text-xs text-muted-foreground">Member since {longDate(user.createdAt)} · {user.google ? 'Google linked' : 'Email & password'}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
                <Button variant="outline" onClick={() => updateProfile({ name })} disabled={!name.trim() || name === user.name}>Save</Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={user.hasPassword ? 'Change password' : 'Set a password'} subtitle="Changing it signs out all your other sessions" action={<KeyRound className="h-4 w-4 text-muted-foreground" />} />
            <form onSubmit={changePassword} className="space-y-3 p-5">
              {msg.pw && <Notice tone={msg.pw.tone}>{msg.pw.text}</Notice>}
              {user.hasPassword && (
                <Field label="Current password">
                  <Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                </Field>
              )}
              <Field label="New password" hint="8+ characters with letters and numbers">
                <Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              </Field>
              <Button type="submit" disabled={!pw.next}>Update password</Button>
            </form>
          </Card>

          <TwoFactor />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Active sessions" subtitle="Each sign-in is a separate session. Revoke any you don't recognise." action={<Button size="sm" variant="outline" icon={LogOut} onClick={revokeOthers}>Sign out others</Button>} />
            {msg.sessions && <Notice tone={msg.sessions.tone} className="mx-5 mt-4">{msg.sessions.text}</Notice>}
            {sessions.loading && !sessions.data ? <Spinner /> : (
              <ul className="divide-y divide-border px-5 pb-2 pt-2">
                {sessions.data?.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{device(s.userAgent)} {s.current && <Badge tone="success" className="ml-1">This device</Badge>}</p>
                        <p className="text-xs text-muted-foreground">{s.ip || 'unknown IP'} · signed in {when(s.createdAt)} via {s.method} · active {when(s.lastSeenAt)}</p>
                      </div>
                    </div>
                    {!s.current && <Button size="sm" variant="ghost" onClick={() => revoke(s.id)}>Revoke</Button>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Security log" subtitle="Recent sign-ins and account changes" action={<ShieldCheck className="h-4 w-4 text-muted-foreground" />} />
            <ul className="max-h-72 divide-y divide-border overflow-y-auto px-5 pb-2 pt-2">
              {auditLog.data?.map((e, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className={e.event.includes('failed') ? 'text-danger' : ''}>{EVENT_LABELS[e.event] || e.event}{e.method ? ` (${e.method})` : ''}{e.provider ? ` · ${e.provider}` : ''}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{when(e.at)} · {e.ip}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Your data" subtitle="Download everything we store, or erase your account (DPDP Act 2023 / GDPR rights)" />
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" icon={Download} onClick={() => downloadFile('/auth/export', null, 'fintwin-my-data.json')}>Export my data</Button>
                <Button variant="outline" icon={Trash2} onClick={async () => { await clearUser(user.id); note('delete', 'success', 'Documents stored in this browser were deleted.'); }}>Delete documents in this browser</Button>
              </div>
              {msg.delete && <Notice tone={msg.delete.tone}>{msg.delete.text}</Notice>}
              <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
                {user.hasPassword && (
                  <Field label="Password to confirm" className="w-56">
                    <Input type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} />
                  </Field>
                )}
                <Button variant="danger" icon={Trash2} onClick={deleteAccount}>Delete account</Button>
              </div>
            </div>
          </Card>
          <Button variant="ghost" icon={LogOut} onClick={logout}>Sign out of this device</Button>
        </div>
      </div>
    </div>
  );
}
