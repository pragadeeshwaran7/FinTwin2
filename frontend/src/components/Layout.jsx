import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Atom, Brain, ChevronsLeft, ChevronsRight, FileText, Fingerprint, LayoutDashboard, Lightbulb, LineChart, Link2, LogOut, Menu, MessageSquare, Moon, PiggyBank, Receipt, Settings, Sun, Upload, X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/format';

export const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/upload', label: 'Upload data', icon: Upload },
  { to: '/documents', label: 'Documents (RAG)', icon: FileText },
  { to: '/markets', label: 'Markets', icon: LineChart },
  { to: '/ideas', label: 'Stock ideas', icon: Lightbulb },
  { to: '/portfolio', label: 'Portfolio & QAOA', icon: Atom },
  { to: '/twin', label: 'Your twin', icon: Fingerprint },
  { to: '/savings', label: 'Savings twin', icon: PiggyBank },
  { to: '/assistant', label: 'AI assistant', icon: MessageSquare },
  { to: '/connections', label: 'Connections', icon: Link2 },
  { to: '/models', label: 'Models', icon: Brain },
  { to: '/settings', label: 'Settings & security', icon: Settings },
];
const MOBILE_NAV = ['/dashboard', '/transactions', '/markets', '/assistant'];

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('fintwin-theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);
  return [dark, () => setDark((d) => !d)];
}

function Brand({ compact }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
        <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
          <path d="M5 22l7-7 5 5 10-10" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-base font-semibold">FinTwin</div>
          <div className="text-[11px] text-muted-foreground">Financial digital twin</div>
        </div>
      )}
    </div>
  );
}

function NavItems({ collapsed, onNavigate }) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
              collapsed && 'justify-center px-0',
              isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserFooter({ collapsed, dark, toggleTheme }) {
  const { user, logout } = useAuth();
  const initials = (user?.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="border-t border-border p-3">
      <div className={cn('flex items-center gap-2', collapsed && 'flex-col')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials}</div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user?.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
          </div>
        )}
        <button onClick={toggleTheme} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Toggle dark mode" title="Toggle theme">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button onClick={logout} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Sign out" title="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('fintwin-sidebar') === 'collapsed';
    } catch {
      return false;
    }
  });
  const [drawer, setDrawer] = useState(false);
  const [dark, toggleTheme] = useTheme();
  const location = useLocation();

  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => {
    try {
      localStorage.setItem('fintwin-sidebar', collapsed ? 'collapsed' : 'open');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-card transition-all lg:flex', collapsed ? 'w-[72px]' : 'w-64')}>
        <div className={cn('flex h-16 items-center border-b border-border px-4', collapsed ? 'justify-center' : 'justify-between')}>
          <Brand compact={collapsed} />
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Collapse sidebar">
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="mx-auto mt-3 rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Expand sidebar">
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
        <NavItems collapsed={collapsed} />
        <UserFooter collapsed={collapsed} dark={dark} toggleTheme={toggleTheme} />
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur lg:hidden">
        <Brand />
        <button onClick={() => setDrawer(true)} className="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </header>
      {drawer && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setDrawer(false)}>
          <aside className="flex h-full w-72 max-w-[85vw] flex-col bg-card animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Brand />
              <button onClick={() => setDrawer(false)} className="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavItems onNavigate={() => setDrawer(false)} />
            <UserFooter dark={dark} toggleTheme={toggleTheme} />
          </aside>
        </div>
      )}

      <main className={cn('pb-24 transition-all lg:pb-10', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border bg-card lg:hidden">
        {NAV.filter((n) => MOBILE_NAV.includes(n.to)).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[11px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
            <Icon className="h-5 w-5" />
            {label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
