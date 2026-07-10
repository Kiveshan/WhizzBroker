"use client";

import { Navigate, Outlet, useLocation, matchPath } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTE_ROLES, dashboardForRole } from "../config/routeRoles";

const ADMIN_ROLE = 7;

// Layout route that gates everything nested under it behind authentication.
// Render as: <Route element={<RequireAuth />}> ...protected routes... </Route>
export const RequireAuth = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Wait for AuthContext to hydrate from localStorage before deciding, so we
  // don't bounce an authenticated user to the landing page on a hard refresh.
  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

// Layout route that additionally requires the user's roleid to be in `roles`.
// Admins (roleid 7) are always allowed through as a superuser.
// Render as: <Route element={<RequireRole roles={[4]} />}> ...routes... </Route>
export const RequireRole = ({ roles = [] }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const allowed = [...new Set([...roles, ADMIN_ROLE])];
  if (!allowed.includes(user?.roleid)) {
    return <Navigate to={dashboardForRole(user?.roleid)} replace />;
  }

  return <Outlet />;
};

// Layout route that enforces the central ROUTE_ROLES matrix against the current
// path. Wrap the whole authenticated subtree in it:
//   <Route element={<RequireAuth />}>
//     <Route element={<RoleGuard />}> ...all routes... </Route>
//   </Route>
// Admins (roleid 7) bypass all checks. Paths not present in the matrix are
// allowed for any authenticated user (fail-open on role; auth is still enforced).
export const RoleGuard = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  const roleid = user?.roleid;
  if (roleid === ADMIN_ROLE) return <Outlet />;

  const entry = ROUTE_ROLES.find((r) =>
    matchPath({ path: r.pattern, end: true }, location.pathname)
  );

  // Unmapped route → allow (auth already enforced). Mapped → enforce roles.
  if (entry && !entry.roles.includes(roleid)) {
    return <Navigate to={dashboardForRole(roleid)} replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
