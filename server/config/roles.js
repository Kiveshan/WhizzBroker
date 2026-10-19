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

// Role groups for server-side route guards (requireRoles in middleware/auth.js).
// They mirror the client matrix in client/src/config/routeRoles.js — when a
// screen's roles change there, change the guard on the endpoints it calls here.
// ADMIN is always allowed by requireRoles, so it is not listed.

// Every role with a UI. Drivers, subcontractors and yard staff exist as
// m5_employee rows but have no screens, so their tokens are refused API-wide.
export const STAFF_ROLES = [
  ROLES.MANAGER,
  ROLES.CONTROLLER,
  ROLES.DEBTORS_CLERK,
  ROLES.DIRECTOR,
  ROLES.CREDITORS_CLERK,
];
// Manage screens: rates, rate cards, clients, employees, subcontractors, company.
export const MANAGEMENT_ROLES = [ROLES.MANAGER, ROLES.DIRECTOR];
// Debtors screens: payments, client statements.
export const DEBTORS_ROLES = [ROLES.DEBTORS_CLERK, ROLES.MANAGER, ROLES.DIRECTOR];
// Creditors screens: credit notes.
export const CREDITORS_ROLES = [ROLES.CREDITORS_CLERK, ROLES.MANAGER, ROLES.DIRECTOR];
// Wage / payroll screens.
export const PAYROLL_ROLES = [
  ROLES.MANAGER,
  ROLES.DIRECTOR,
  ROLES.CREDITORS_CLERK,
  ROLES.DEBTORS_CLERK,
];

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
