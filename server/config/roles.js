// Single source of truth for roleid values. These mirror the roleid column on
// usertable / m5_employee and the client-side matrix in
// client/src/config/routeRoles.js — keep the two in sync.
export const ROLES = {
  MANAGER: 1,
  CONTROLLER: 2,
  DEBTORS_CLERK: 3,
  DIRECTOR: 4,
  DRIVER: 5,
  SUBCONTRACTOR: 6,
  ADMIN: 7,
  CREDITORS_CLERK: 8,
  YARD_STAFF: 9,
};

// Post-login landing page per role (must match the client's ROLE_DASHBOARDS).
export const ROLE_DASHBOARDS = {
  [ROLES.MANAGER]: "/Dashboard",
  [ROLES.CONTROLLER]: "/ControllerDashboard",
  [ROLES.DEBTORS_CLERK]: "/FDashboard",
  [ROLES.DIRECTOR]: "/DirectorDashboard",
  [ROLES.ADMIN]: "/AdminDashboard",
  [ROLES.CREDITORS_CLERK]: "/CreditorsDashboard",
};

export const dashboardForRole = (roleid) => ROLE_DASHBOARDS[roleid] || "/";
