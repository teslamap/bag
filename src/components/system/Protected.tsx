import { Navigate, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';

function AuthLoading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center gap-3 text-[11px] uppercase tracking-[0.18em] text-ink/65">
      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
      სესია მოწმდება…
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const snapshot = useBackendSnapshot();
  const location = useLocation();
  if (!snapshot.authReady) return <AuthLoading />;
  if (!snapshot.session) {
    return <Navigate to={`/auth?mode=login&next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const snapshot = useBackendSnapshot();
  const location = useLocation();
  if (!snapshot.authReady) return <AuthLoading />;
  if (!snapshot.session) {
    return <Navigate to={`/auth?mode=login&next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (snapshot.session.role !== 'admin') {
    return <Navigate to={snapshot.session.role === 'manager' ? '/manager' : '/account'} replace />;
  }
  return <>{children}</>;
}

export function RequireStaff({ children }: { children: React.ReactNode }) {
  const snapshot = useBackendSnapshot();
  const location = useLocation();
  if (!snapshot.authReady) return <AuthLoading />;
  if (!snapshot.session) {
    return <Navigate to={`/auth?mode=login&next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (snapshot.session.role !== 'manager' && snapshot.session.role !== 'admin') {
    return <Navigate to="/account" replace />;
  }
  return <>{children}</>;
}

export function RequireCustomer({ children }: { children: React.ReactNode }) {
  const snapshot = useBackendSnapshot();
  const location = useLocation();
  if (!snapshot.authReady) return <AuthLoading />;
  if (!snapshot.session) {
    return <Navigate to={`/auth?mode=login&next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return <>{children}</>;
}
