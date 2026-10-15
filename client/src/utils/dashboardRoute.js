/**
 * Where "Back to dashboard" should land for the signed-in user.
 *
 * Role 1 (Business Manager) has its own dashboard; directors and everyone else
 * share the director one. The role id is stored inconsistently across the app —
 * usually inside the "user" blob, but some flows only ever wrote the bare
 * "roleId"/"userRoleId" keys — so all three are checked before giving up.
 */
export function roleIdFromStorage() {
  const userData = localStorage.getItem("user");
  if (userData) {
    try {
      const parsed = JSON.parse(userData);
      if (parsed?.roleid) return Number.parseInt(parsed.roleid, 10);
    } catch {
      /* fall through to the bare keys below */
    }
  }
  const bare = localStorage.getItem("roleId") || localStorage.getItem("userRoleId");
  const parsed = Number.parseInt(bare, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function dashboardRouteForRole(roleId = roleIdFromStorage()) {
  return roleId === 1 ? "/Dashboard" : "/DirectorDashboard";
}
