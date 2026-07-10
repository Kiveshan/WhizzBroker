// Centralised role-based access matrix.
//
// Each entry maps a route pattern (react-router syntax) to the role IDs allowed
// to view it. Admins (roleid 7) are ALWAYS allowed and do not need to be listed.
// Order matters: the first matching pattern wins, so list more specific patterns
// before more general ones.
//
// Role IDs:
//   1 = Business Manager   2 = Controller   3 = Debtors/Finance Clerk
//   4 = Director           7 = Admin        8 = Creditors Clerk
//
// The matrix was derived from the navigation reachable from each role's
// dashboard. Roles 1 (Manager) and 4 (Director) transitively reach almost the
// whole app via the Dashboard <-> Director dashboards, so they appear broadly.
// Roles 2/3/8 are scoped to their own feature areas.
//
// Routes NOT listed here fall through to "allow any authenticated user" (see
// RoleGuard) — auth is still enforced; only the role check is skipped. This is
// deliberate fail-open-on-role so an accidental omission can't lock staff out.
//
// ⚠️ UNCERTAIN — confirm with the product owner (see comments inline):
//   - FC / assignment edit instruction flows (who edits: clerk vs controller?)
//   - /ExpenseSubmission (who submits fuel/expense slips?)
//   - Wages access for the Creditors role.

export const ROUTE_ROLES = [
  // ---------- Dashboards ----------
  { pattern: "/AdminDashboard", roles: [7] },
  { pattern: "/Dashboard", roles: [1, 4] },
  { pattern: "/ControllerDashboard", roles: [2, 1, 4] },
  { pattern: "/FDashboard", roles: [3, 1, 4] },
  { pattern: "/CreditorsDashboard", roles: [8, 1, 4] },
  { pattern: "/DebtorsDashboard", roles: [3, 1, 4] },
  { pattern: "/DirectorDashboard", roles: [4, 1] },

  // ---------- Manage (business configuration) ----------
  { pattern: "/manage", roles: [1, 4] },

  // ---------- Reports & analytics ----------
  { pattern: "/analytics-reports", roles: [1, 4] },
  { pattern: "/reports", roles: [1, 4] },
  { pattern: "/DirectorAnalytics", roles: [4, 1] },
  { pattern: "/wage-reports", roles: [1, 4] },
  { pattern: "/client-subbie-commission", roles: [1, 4] },
  { pattern: "/profit-loss-reports", roles: [1, 4] },
  { pattern: "/income-expenditure-reports/:month/:year", roles: [1, 4] },
  { pattern: "/vat-recon-reports", roles: [1, 4] },

  // ---------- Director-only views ----------
  { pattern: "/DirectorDebtors", roles: [4, 1] },
  { pattern: "/DirectorCreditorsDash", roles: [4, 1] },
  { pattern: "/DirectorCreditorsOther", roles: [4, 1] },
  { pattern: "/DirectorFinancialDocumentsView", roles: [4, 1] },
  { pattern: "/DirectorClientDocuments", roles: [4, 1] },
  { pattern: "/DirectorClientPaymentList", roles: [4, 1] },
  { pattern: "/DirectorDocs", roles: [4, 1] },
  { pattern: "/DirectorManagerViewAssignment", roles: [4, 1] },
  { pattern: "/DirectorManagerViewFuelExpense", roles: [4, 1] },
  { pattern: "/DirectorExpenses/:truckId", roles: [4, 1] },
  { pattern: "/director-client-list-payments", roles: [4, 1] },

  // ---------- Controller: instruction creation & tracking ----------
  { pattern: "/ControllerInstructions", roles: [2, 1, 4] },
  { pattern: "/ControllerInstructionDetails", roles: [2, 1, 4] },
  { pattern: "/CompanyInstructionView", roles: [2, 1, 4] },
  { pattern: "/CompanyInstructions", roles: [2, 1, 4] },
  { pattern: "/Viewcontrollerinstructions", roles: [2, 1, 4] },
  { pattern: "/ViewcontrollerInstructionDetails", roles: [2, 1, 4] },

  // ---------- Instruction edit / assignment flows (⚠️ uncertain role mix) ----------
  { pattern: "/FCcontrollerinstructions", roles: [3, 2, 1, 4] },
  { pattern: "/FCcontrollerInstructionDetails", roles: [3, 2, 1, 4] },
  { pattern: "/instructions", roles: [3, 2, 1, 4] },
  { pattern: "/update-instructions", roles: [3, 2, 1, 4] },
  { pattern: "/Upload-Instruction-Documents", roles: [3, 2, 1, 4] },

  // ---------- Debtors / invoices / statements / payments ----------
  { pattern: "/ViewClientInstruction", roles: [3, 1, 4] },
  { pattern: "/ViewClientInvoice", roles: [3, 1, 4] },
  { pattern: "/invoices", roles: [3, 1, 4] },
  { pattern: "/invoice/:id/download", roles: [3, 1, 4] },
  { pattern: "/invoice/:id", roles: [3, 1, 4] },
  { pattern: "/invoice", roles: [3, 1, 4] },
  { pattern: "/client-invoice", roles: [3, 1, 4] },
  { pattern: "/statements-list", roles: [3, 1, 4] },
  { pattern: "/client-statement", roles: [3, 1, 4] },
  { pattern: "/view-client-statements", roles: [3, 1, 4] },
  { pattern: "/view-client-list", roles: [3, 1, 4] },
  { pattern: "/debtors", roles: [3, 1, 4] },
  { pattern: "/debtors-age-analysis", roles: [3, 1, 4] },
  { pattern: "/client-payments", roles: [3, 1, 4] },
  { pattern: "/client-list-payments", roles: [3, 1, 4] },
  { pattern: "/client-documents", roles: [3, 1, 4] },
  { pattern: "/FinancialDocumentsView", roles: [3, 1, 4] },
  { pattern: "/upload-proof/:clientName/:paymentId?", roles: [3, 1, 4] },
  { pattern: "/upload/:clientName", roles: [3, 1, 4] },
  { pattern: "/view-add-on-list", roles: [3, 1, 4] },
  { pattern: "/add-on-form", roles: [3, 1, 4] },

  // ---------- Creditors: purchase orders, subcontractors, credit notes ----------
  { pattern: "/CredClientList", roles: [8, 1, 4] },
  { pattern: "/credit-note-list", roles: [8, 1, 4] },
  { pattern: "/credit-note-form", roles: [8, 1, 4] },
  { pattern: "/view-credit-note/:clientName/:creditNoteId", roles: [8, 1, 4] },
  { pattern: "/Creditors/CreditorsOther", roles: [8, 1, 4] },
  { pattern: "/Creditors/CreatePO", roles: [8, 1, 4] },
  { pattern: "/Creditors/POForm", roles: [8, 1, 4] },
  { pattern: "/Creditors/PurchaseOrders", roles: [8, 1, 4] },
  { pattern: "/Creditors/PurchaseOrder/View", roles: [8, 1, 4] },
  { pattern: "/Creditors/CredStatements", roles: [8, 1, 4] },
  { pattern: "/Creditors/ViewStatement", roles: [8, 1, 4] },
  { pattern: "/Creditors/SubcontractorList", roles: [8, 1, 4] },
  { pattern: "/Creditors/SubcontractorStatements", roles: [8, 1, 4] },
  { pattern: "/Creditors/SubcontractorStatementDetails", roles: [8, 1, 4] },

  // ---------- Fuel / truck expenses ----------
  { pattern: "/FuelPage", roles: [8, 1, 4] },
  { pattern: "/ViewExpense", roles: [8, 1, 4] },
  { pattern: "/ExpenseDetails/:truckId", roles: [8, 1, 4] },
  { pattern: "/ExpenseSubmission", roles: [8, 2, 1, 4] }, // ⚠️ confirm who submits slips

  // ---------- Wages / payroll (⚠️ confirm Creditors access) ----------
  { pattern: "/finance-clerk-wage", roles: [1, 4, 8, 3] },
  { pattern: "/finance-clerk-wage-details/:userid", roles: [1, 4, 8, 3] },
  { pattern: "/finance-clerk-wage-slip/:id", roles: [1, 4, 8, 3] },
  { pattern: "/FClerkLegDetails", roles: [1, 4, 8, 3] },
];

// Where to send each role when they hit a page they are not allowed to view.
export const ROLE_DASHBOARDS = {
  1: "/Dashboard",
  2: "/ControllerDashboard",
  3: "/FDashboard",
  4: "/DirectorDashboard",
  7: "/AdminDashboard",
  8: "/CreditorsDashboard",
};

export const dashboardForRole = (roleid) => ROLE_DASHBOARDS[roleid] || "/";
