import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AccessDenied } from './AccessDenied';
import type { UserRole } from '../types';

/* ------------------------------------------------------------------ */
/*  ProtectedRoute                                                     */
/*  Wraps a route element and enforces authentication + role checks.   */
/* ------------------------------------------------------------------ */

interface ProtectedRouteProps {
  /** The component / element to render when access is granted. */
  children: React.ReactNode;
  /** Which roles may access this route. If omitted, any authenticated user. */
  allowedRoles?: UserRole[];
  /** Where to redirect unauthenticated users (default: /login). */
  loginPath?: string;
  /** Where to redirect unauthorized users (default: /app/pos). */
  fallbackPath?: string;
  /** If true, show AccessDenied page instead of redirecting unauthorized users. */
  showAccessDenied?: boolean;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  loginPath = '/login',
  fallbackPath = '/app/pos',
  showAccessDenied = false,
}: ProtectedRouteProps) {
  const { session, role, isAuthLoading, isProfileLoading, authView } = useAuth();

  // Still resolving auth – render nothing (parent shows loading screen)
  if (isAuthLoading) return null;

  // Not authenticated → login
  if (!session) {
    return <Navigate to={loginPath} replace />;
  }

  // Password recovery flow takes priority
  if (authView === 'recovery') {
    return <Navigate to="/reset-password" replace />;
  }

  // Still loading profile / role
  if (isProfileLoading) return null;

  // Role check
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (showAccessDenied) {
      return <AccessDenied fallbackPath={fallbackPath} />;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
