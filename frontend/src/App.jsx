import { Component, lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { Button, Spinner } from './components/ui';
import { useAuth } from './lib/auth';
import { Login, Register } from './pages/Auth';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Upload = lazy(() => import('./pages/Upload'));
const Markets = lazy(() => import('./pages/Markets'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Savings = lazy(() => import('./pages/Savings'));
const Assistant = lazy(() => import('./pages/Assistant'));
const Models = lazy(() => import('./pages/Models'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Ideas = lazy(() => import('./pages/Ideas'));
const Documents = lazy(() => import('./pages/Documents'));
const Twin = lazy(() => import('./pages/Twin'));
const Connections = lazy(() => import('./pages/Connections'));
const Settings = lazy(() => import('./pages/Settings'));

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold">Something went wrong on this page</p>
        <p className="max-w-md text-sm text-muted-foreground">{this.state.error.message}</p>
        <Button variant="outline" onClick={() => this.setState({ error: null })}>
          Try again
        </Button>
      </div>
    );
  }
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Loading your twin…" className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen" />;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  const location = useLocation();
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        {[
          ['/dashboard', Dashboard], ['/transactions', Transactions], ['/upload', Upload], ['/markets', Markets],
          ['/portfolio', Portfolio], ['/savings', Savings], ['/assistant', Assistant], ['/models', Models],
          ['/ideas', Ideas], ['/documents', Documents], ['/twin', Twin], ['/connections', Connections], ['/settings', Settings],
        ].map(([path, Page]) => (
          <Route
            key={path}
            path={path}
            element={
              <ErrorBoundary key={location.pathname}>
                <Suspense fallback={<Spinner />}>
                  <Page />
                </Suspense>
              </ErrorBoundary>
            }
          />
        ))}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Suspense fallback={<Spinner />}><NotFound /></Suspense>} />
      </Route>
    </Routes>
  );
}
