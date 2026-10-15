/**
 * Audit action registry — the single source of truth for how an HTTP request is
 * described in the audit trail.
 *
 * server/middleware/auditTrail.js matches every incoming request against this
 * table and writes one audit_log row per state-changing request (plus the reads
 * marked `sensitive`, e.g. payroll and document downloads).
 *
 * Coverage rules:
 *  - Every POST/PUT/PATCH/DELETE route is audited. Unregistered ones still get
 *    logged, under an UNMAPPED_<METHOD> action — the trail is never silently
 *    incomplete, and the odd action name flags the route as needing an entry.
 *  - GET routes are only audited when listed here with `sensitive: true`.
 *
 * Fields per entry:
 *   method    HTTP verb.
 *   path      Express-style path (":param" segments), matched against the full
 *             URL, so it includes any router mount prefix (/api/instructions…).
 *   action    action_type written to audit_log (SCREAMING_SNAKE_CASE).
 *   entity    entity_type discriminator, kept in sync with the viewer's filter.
 *   target    Name of the path param holding the affected record's id.
 *   sensitive Audit this route even though it is a read.
 *   skip      Never audit: a POST that only reads (previews, usage checks).
 *             Without this, unregistered writes are logged as UNMAPPED_*, and
 *             the assignment rate preview alone fires on every edit.
 */

// ---------------------------------------------------------------------------
// Routes deliberately never audited: health checks, session/role pings and the
// public landing stats. High volume, zero forensic value.
// ---------------------------------------------------------------------------
export const AUDIT_EXCLUDED_PATHS = [
  "/health",
  "/test-connection",
  "/test-session",
  "/set-session-test",
  "/check-session-test",
  "/api/test",
  "/user-info",
  "/api/user-role",
  "/check-email",
  "/admin/verify",
  "/api/landing/stats",
];

export const AUDIT_ROUTES = [
  // --- Authentication & access -------------------------------------------
  { method: "POST", path: "/login", action: "LOGIN", entity: "auth" },
  { method: "POST", path: "/logout", action: "LOGOUT", entity: "auth" },
  { method: "POST", path: "/register", action: "USER_REGISTERED", entity: "auth" },

  // --- Admin: user & company administration -------------------------------
  { method: "POST", path: "/admin/approve-user", action: "USER_APPROVED", entity: "user" },
  { method: "POST", path: "/admin/reject-user", action: "USER_REJECTED", entity: "user" },
  { method: "POST", path: "/api/admin/user-status", action: "USER_STATUS_UPDATED", entity: "user" },
  { method: "POST", path: "/api/company/deactivate", action: "COMPANY_DEACTIVATED", entity: "company" },
  { method: "POST", path: "/api/company/reactivate", action: "COMPANY_REACTIVATED", entity: "company" },
  { method: "GET", path: "/api/admin/audit-log", action: "AUDIT_LOG_VIEWED", entity: "audit", sensitive: true },
  { method: "GET", path: "/admin/pending-users", action: "PENDING_USERS_VIEWED", entity: "user", sensitive: true },

  // --- Employees -----------------------------------------------------------
  { method: "POST", path: "/api/employees", action: "EMPLOYEE_CREATED", entity: "employee" },
  { method: "PUT", path: "/api/employees/:id", action: "EMPLOYEE_UPDATED", entity: "employee", target: "id" },
  { method: "PUT", path: "/api/employees/:id/toggle-status", action: "EMPLOYEE_STATUS_TOGGLED", entity: "employee", target: "id" },
  { method: "POST", path: "/api/employees/delete-doc", action: "EMPLOYEE_DOCUMENT_DELETED", entity: "employee" },
  { method: "GET", path: "/api/employees/:id/details", action: "EMPLOYEE_DETAILS_VIEWED", entity: "employee", target: "id", sensitive: true },

  // --- Clients -------------------------------------------------------------
  { method: "POST", path: "/api/m5Clients", action: "CLIENT_CREATED", entity: "client" },
  { method: "PUT", path: "/api/m5Clients/:id", action: "CLIENT_UPDATED", entity: "client", target: "id" },
  { method: "DELETE", path: "/api/m5Clients/:id", action: "CLIENT_DELETED", entity: "client", target: "id" },
  { method: "PUT", path: "/api/clients/:id/toggle-status", action: "CLIENT_STATUS_TOGGLED", entity: "client", target: "id" },

  // --- Trucks --------------------------------------------------------------
  { method: "POST", path: "/api/trucks", action: "TRUCK_CREATED", entity: "truck" },
  { method: "PUT", path: "/api/trucks/:id", action: "TRUCK_UPDATED", entity: "truck", target: "id" },
  { method: "PUT", path: "/api/trucks/:id/status", action: "TRUCK_STATUS_TOGGLED", entity: "truck", target: "id" },
  { method: "DELETE", path: "/api/trucks/:id", action: "TRUCK_DELETED", entity: "truck", target: "id" },
  { method: "POST", path: "/api/trucks/delete-doc", action: "TRUCK_DOCUMENT_DELETED", entity: "truck" },

  // --- Trailers ------------------------------------------------------------
  { method: "POST", path: "/api/trailers", action: "TRAILER_CREATED", entity: "trailer" },
  { method: "PUT", path: "/api/trailers/:id", action: "TRAILER_UPDATED", entity: "trailer", target: "id" },
  { method: "PUT", path: "/api/trailers/:id/toggle-status", action: "TRAILER_STATUS_TOGGLED", entity: "trailer", target: "id" },
  { method: "POST", path: "/api/trailers/delete-doc", action: "TRAILER_DOCUMENT_DELETED", entity: "trailer" },

  // --- Subcontractors ------------------------------------------------------
  { method: "POST", path: "/api/subcontractors", action: "SUBCONTRACTOR_CREATED", entity: "subcontractor" },
  { method: "PUT", path: "/api/subcontractors/:id", action: "SUBCONTRACTOR_UPDATED", entity: "subcontractor", target: "id" },
  { method: "PUT", path: "/api/subcontractors/:id/toggle-status", action: "SUBCONTRACTOR_STATUS_TOGGLED", entity: "subcontractor", target: "id" },
  { method: "PUT", path: "/api/subcontractors/drivers/:driverId/toggle-status", action: "SUBCONTRACTOR_DRIVER_STATUS_TOGGLED", entity: "subcontractor", target: "driverId" },
  { method: "DELETE", path: "/api/subcontractors/drivers/:driverId", action: "SUBCONTRACTOR_DRIVER_DELETED", entity: "subcontractor", target: "driverId" },
  { method: "DELETE", path: "/api/subcontractors/trucks/:truckId", action: "SUBCONTRACTOR_TRUCK_DELETED", entity: "subcontractor", target: "truckId" },

  // --- Suppliers -----------------------------------------------------------
  { method: "POST", path: "/api/suppliers", action: "SUPPLIER_CREATED", entity: "supplier" },
  { method: "PUT", path: "/api/suppliers/:id", action: "SUPPLIER_UPDATED", entity: "supplier", target: "id" },
  { method: "PUT", path: "/api/suppliers/:id/toggle-status", action: "SUPPLIER_STATUS_TOGGLED", entity: "supplier", target: "id" },
  { method: "DELETE", path: "/api/suppliers/:id", action: "SUPPLIER_DELETED", entity: "supplier", target: "id" },

  // --- Expense types & company ---------------------------------------------
  { method: "POST", path: "/api/expense-types", action: "EXPENSE_TYPE_CREATED", entity: "expense_type" },
  { method: "PUT", path: "/api/expense-types/:id", action: "EXPENSE_TYPE_UPDATED", entity: "expense_type", target: "id" },
  { method: "DELETE", path: "/api/expense-types/:id", action: "EXPENSE_TYPE_DELETED", entity: "expense_type", target: "id" },
  { method: "PUT", path: "/api/companies", action: "COMPANY_UPDATED", entity: "company" },

  // --- Rates ---------------------------------------------------------------
  { method: "POST", path: "/api/client-rates/:clientId", action: "CLIENT_RATES_SAVED", entity: "client_rate", target: "clientId" },
  { method: "DELETE", path: "/api/client-rates/rate/:rateId", action: "CLIENT_RATE_DELETED", entity: "client_rate", target: "rateId" },
  // Shared rate cards (broker).
  { method: "POST", path: "/api/rate-cards", action: "RATE_CARD_CREATED", entity: "rate_card" },
  { method: "PUT", path: "/api/rate-cards/:rateCardId", action: "RATE_CARD_UPDATED", entity: "rate_card", target: "rateCardId" },
  { method: "DELETE", path: "/api/rate-cards/:rateCardId", action: "RATE_CARD_DELETED", entity: "rate_card", target: "rateCardId" },
  { method: "POST", path: "/api/rate-cards/rate-usage", action: "RATE_USAGE_CHECKED", entity: "rate_card", skip: true },
  { method: "POST", path: "/api/rate-cards/assignment-conflicts", action: "RATE_CARD_CONFLICTS_CHECKED", entity: "rate_card", skip: true },
  { method: "POST", path: "/api/driver-rates", action: "DRIVER_RATE_CREATED", entity: "driver_rate" },
  { method: "PUT", path: "/api/driver-rates/:id", action: "DRIVER_RATE_UPDATED", entity: "driver_rate", target: "id" },
  { method: "DELETE", path: "/api/driver-rates/:id", action: "DRIVER_RATE_DELETED", entity: "driver_rate", target: "id" },
  { method: "POST", path: "/api/driver-rates/:id/refresh-legs", action: "DRIVER_RATE_LEGS_REFRESHED", entity: "driver_rate", target: "id" },
  { method: "POST", path: "/api/driver-rates/route-periods", action: "DRIVER_RATE_ROUTE_PERIODS_SAVED", entity: "driver_rate" },
  { method: "DELETE", path: "/api/driver-rates/route", action: "DRIVER_RATE_ROUTE_DELETED", entity: "driver_rate" },
  { method: "GET", path: "/api/driver-rates/month-audit", action: "DRIVER_RATE_MONTH_AUDIT_VIEWED", entity: "driver_rate", sensitive: true },
  { method: "POST", path: "/api/driver-rates/month-audit/apply", action: "DRIVER_RATE_AUDIT_APPLIED", entity: "driver_rate" },

  // --- Instructions (mounted at /api/instructions) --------------------------
  { method: "POST", path: "/api/instructions/save-instruction", action: "INSTRUCTION_SAVED", entity: "instruction" },
  { method: "POST", path: "/api/instructions/containers/:instructionId", action: "INSTRUCTION_CONTAINERS_UPDATED", entity: "instruction", target: "instructionId" },
  { method: "POST", path: "/api/instructions/fc/save-instruction", action: "FC_INSTRUCTION_SAVED", entity: "instruction" },
  { method: "PUT", path: "/api/instructions/fc/containers/:instructionId", action: "FC_CONTAINERS_UPDATED", entity: "instruction", target: "instructionId" },
  { method: "PUT", path: "/api/instructions/fc/update/:id", action: "FC_INSTRUCTION_UPDATED", entity: "instruction", target: "id" },
  { method: "DELETE", path: "/api/instructions/fc/instruction/:id", action: "INSTRUCTION_DELETED", entity: "instruction", target: "id" },
  { method: "DELETE", path: "/api/instructions/fc/container/:instructionId/:containerNum", action: "FC_CONTAINER_DELETED", entity: "instruction", target: "instructionId" },
  // Grouped instructions (broker): one group per client booking, one
  // m1_controller child per sub-instruction.
  { method: "POST", path: "/api/instructions/group", action: "INSTRUCTION_GROUP_CREATED", entity: "instruction" },
  { method: "POST", path: "/api/instructions/group/:id/instructions", action: "INSTRUCTION_ADDED_TO_GROUP", entity: "instruction", target: "id" },

  // --- Assignments / legs (mounted at the router root) ----------------------
  { method: "PUT", path: "/instructions/:instructionId/status", action: "INSTRUCTION_STATUS_UPDATED", entity: "instruction", target: "instructionId" },
  { method: "PUT", path: "/instructions/:instructionId/complete", action: "INSTRUCTION_COMPLETED", entity: "instruction", target: "instructionId" },
  { method: "POST", path: "/legs/save", action: "LEG_SAVED", entity: "leg" },
  { method: "PUT", path: "/legs/:legId/update-number", action: "LEG_NUMBER_UPDATED", entity: "leg", target: "legId" },
  { method: "DELETE", path: "/legs/:legId", action: "LEG_DELETED", entity: "leg", target: "legId" },
  // Group assignment (broker): a subcontractor takes a set of containers off
  // one child instruction; finalising the group raises its one invoice.
  { method: "POST", path: "/instruction/:m1key/assign", action: "SUBCONTRACTOR_ASSIGNED", entity: "assignment", target: "m1key" },
  { method: "DELETE", path: "/assignment/:legkey", action: "ASSIGNMENT_REMOVED", entity: "assignment", target: "legkey" },
  { method: "POST", path: "/instruction/:m1key/rate-preview", action: "ASSIGNMENT_RATE_PREVIEWED", entity: "assignment", skip: true },
  { method: "POST", path: "/group/:groupId/finalise", action: "INSTRUCTION_GROUP_FINALISED", entity: "invoice", target: "groupId" },

  // --- Invoices ------------------------------------------------------------
  { method: "POST", path: "/api/invoice/create", action: "INVOICE_CREATED", entity: "invoice" },
  { method: "PUT", path: "/api/invoice/update-instruction", action: "INVOICE_INSTRUCTION_UPDATED", entity: "invoice" },
  { method: "POST", path: "/api/invoices/preview/:instructionId", action: "INVOICE_PREVIEW_GENERATED", entity: "invoice", target: "instructionId" },
  { method: "POST", path: "/generate-invoice/:instructionId", action: "INVOICE_GENERATED", entity: "invoice", target: "instructionId" },

  // --- Payments & credit notes ---------------------------------------------
  { method: "POST", path: "/api/payments/:clientId/upload", action: "PAYMENT_CREATED", entity: "payment", target: "clientId" },
  { method: "DELETE", path: "/api/payments/:clientId/:paymentId", action: "PAYMENT_DELETED", entity: "payment", target: "paymentId" },
  { method: "POST", path: "/api/credit-notes", action: "CREDIT_NOTE_CREATED", entity: "credit_note" },

  // --- Statements ----------------------------------------------------------
  { method: "POST", path: "/subcontractor/generate-statement", action: "SUBCONTRACTOR_STATEMENT_GENERATED", entity: "statement" },
  { method: "POST", path: "/subcontractor/backfill-statements", action: "SUBCONTRACTOR_STATEMENTS_BACKFILLED", entity: "statement" },

  // Client statement export snapshots. The controller writes richer rows via
  // auditFromReq (balance, aging, content hash), so the middleware stands down
  // for the POSTs; registered here so the route table stays a complete map.
  // Retrieving a stored document is a sensitive read — it is how a historical
  // financial document leaves the system.
  { method: "POST", path: "/api/statements/:statementId/export", action: "CLIENT_STATEMENT_EXPORTED", entity: "client_statement", target: "statementId" },
  { method: "POST", path: "/api/statement-exports/:exportId/document", action: "CLIENT_STATEMENT_DOCUMENT_STORED", entity: "client_statement", target: "exportId" },
  { method: "GET", path: "/api/statement-exports/:exportId", action: "CLIENT_STATEMENT_SNAPSHOT_VIEWED", entity: "client_statement", target: "exportId", sensitive: true },

  { method: "POST", path: "/subcontractor/statements/export", action: "SUBCONTRACTOR_STATEMENT_EXPORTED", entity: "subcontractor_statement" },
  { method: "POST", path: "/subcontractor/statements/exports/:exportId/document", action: "SUBCONTRACTOR_STATEMENT_DOCUMENT_STORED", entity: "subcontractor_statement", target: "exportId" },
  { method: "GET", path: "/subcontractor/statements/exports/:exportId", action: "SUBCONTRACTOR_STATEMENT_SNAPSHOT_VIEWED", entity: "subcontractor_statement", target: "exportId", sensitive: true },

  // --- Add-ons -------------------------------------------------------------
  { method: "POST", path: "/api/addons", action: "ADDON_CREATED", entity: "addon" },
  { method: "PUT", path: "/api/addons/:addonId", action: "ADDON_UPDATED", entity: "addon", target: "addonId" },
  { method: "DELETE", path: "/api/addons/:addonId", action: "ADDON_DELETED", entity: "addon", target: "addonId" },

  // --- Documents (mounted at /documents) -----------------------------------
  { method: "POST", path: "/documents/upload", action: "DOCUMENT_UPLOADED", entity: "document" },
  { method: "DELETE", path: "/documents/:documentId", action: "DOCUMENT_DELETED", entity: "document", target: "documentId" },

  // --- Fuel & expense slips (mounted at /expenses) --------------------------
  { method: "POST", path: "/expenses", action: "FUEL_EXPENSE_CREATED", entity: "expense" },
  { method: "GET", path: "/expenses/document/:id", action: "EXPENSE_DOCUMENT_VIEWED", entity: "expense", target: "id", sensitive: true },

  // --- Purchase orders -----------------------------------------------------
  { method: "POST", path: "/api/po-form/create", action: "PURCHASE_ORDER_CREATED", entity: "purchase_order" },
  { method: "POST", path: "/api/po-form/create-multiple", action: "PURCHASE_ORDERS_CREATED", entity: "purchase_order" },
  { method: "POST", path: "/api/po-form/calculate", action: "PURCHASE_ORDER_CALCULATED", entity: "purchase_order" },
  { method: "POST", path: "/api/po-form/upload-slip", action: "PURCHASE_ORDER_SLIP_UPLOADED", entity: "purchase_order" },
  { method: "DELETE", path: "/api/purchase-orders/:ponum", action: "PURCHASE_ORDER_DELETED", entity: "purchase_order", target: "ponum" },
  { method: "GET", path: "/api/po-form/view-slip/:ponum", action: "PURCHASE_ORDER_SLIP_VIEWED", entity: "purchase_order", target: "ponum", sensitive: true },

  // --- Wages (payroll data — reads are audited too) -------------------------
  { method: "POST", path: "/api/save-wage-data", action: "WAGE_DATA_SAVED", entity: "wage" },
  { method: "PUT", path: "/api/employee-deductions/:employeeId", action: "EMPLOYEE_DEDUCTIONS_UPDATED", entity: "wage", target: "employeeId" },
  { method: "GET", path: "/api/stored-wage-data/:employeeId", action: "WAGE_DATA_VIEWED", entity: "wage", target: "employeeId", sensitive: true },
  { method: "GET", path: "/api/employee-deductions/:employeeId", action: "EMPLOYEE_DEDUCTIONS_VIEWED", entity: "wage", target: "employeeId", sensitive: true },
  { method: "GET", path: "/api/base-salary-history/:employeeId", action: "BASE_SALARY_HISTORY_VIEWED", entity: "wage", target: "employeeId", sensitive: true },

  // --- Financial reports (reads worth a trail) ------------------------------
  { method: "GET", path: "/profit-loss-report", action: "PROFIT_LOSS_REPORT_VIEWED", entity: "report", sensitive: true },
  { method: "GET", path: "/api/vat-recon", action: "VAT_RECON_REPORT_VIEWED", entity: "report", sensitive: true },
  { method: "GET", path: "/api/client-subbie-commission", action: "COMMISSION_REPORT_VIEWED", entity: "report", sensitive: true },
  { method: "GET", path: "/api/income-per-client", action: "INCOME_PER_CLIENT_REPORT_VIEWED", entity: "report", sensitive: true },
];

// Action types written by hand rather than derived from a route — login
// outcomes, and the transactional employee events in utils/auditLogger.js.
export const AUDIT_MANUAL_ACTION_TYPES = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGIN_DENIED",
  "LOGIN_ERROR",
  "PASSWORD_CHANGE",
  "EMPLOYEE_CREATION",
];

// Filter-dropdown values for the audit viewer, derived from the registry so a
// new route shows up automatically. Serving these statically is what keeps the
// viewer off `SELECT DISTINCT action_type FROM audit_log`, which is a full
// table scan on every page load.
const AUDITED_ROUTES = AUDIT_ROUTES.filter((r) => !r.skip);

export const AUDIT_ENTITY_TYPES = [
  ...new Set(AUDITED_ROUTES.map((r) => r.entity)),
].sort();

export const AUDIT_ACTION_TYPES = [
  ...new Set([...AUDITED_ROUTES.map((r) => r.action), ...AUDIT_MANUAL_ACTION_TYPES]),
].sort();

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

// Turn "/api/payments/:clientId/upload" into a regex with named-ish capture
// groups, remembering the param order so values can be zipped back on.
const compile = (pattern) => {
  const paramNames = [];
  const source = pattern
    .split("/")
    .map((segment) => {
      if (!segment) return "";
      if (segment.startsWith(":")) {
        paramNames.push(segment.slice(1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^${source}/?$`, "i"), paramNames };
};

const COMPILED = AUDIT_ROUTES.map((route) => ({ ...route, ...compile(route.path) }));

// Static patterns win over parameterised ones, so /api/driver-rates/route
// is not swallowed by /api/driver-rates/:id.
const specificity = (route) => route.paramNames.length;
COMPILED.sort((a, b) => specificity(a) - specificity(b) || b.path.length - a.path.length);

/**
 * Resolve a request to its audit descriptor.
 * Returns null for paths that are never audited; otherwise an object with
 * { action, entity, params, sensitive, mapped }.
 */
export const resolveAuditRoute = (method, pathname) => {
  const verb = method.toUpperCase();
  const clean = pathname.split("?")[0];

  if (AUDIT_EXCLUDED_PATHS.includes(clean)) return null;

  for (const route of COMPILED) {
    if (route.method !== verb) continue;
    const match = route.regex.exec(clean);
    if (!match) continue;

    const params = {};
    route.paramNames.forEach((name, i) => {
      params[name] = match[i + 1];
    });

    return {
      action: route.action,
      entity: route.entity,
      target: route.target ? params[route.target] : null,
      params,
      sensitive: Boolean(route.sensitive),
      skip: Boolean(route.skip),
      mapped: true,
    };
  }

  // Unregistered route. Reads are ignored; writes are still recorded so the
  // trail stays complete, tagged so they are easy to find and map properly.
  if (verb === "GET" || verb === "HEAD" || verb === "OPTIONS") return null;

  return {
    action: `UNMAPPED_${verb}`,
    entity: deriveEntity(clean),
    target: null,
    params: {},
    sensitive: false,
    mapped: false,
  };
};

// Best-effort entity name for an unregistered route: the first path segment
// that is not "api" and not an id.
const deriveEntity = (pathname) => {
  const segment = pathname
    .split("/")
    .filter(Boolean)
    .find((s) => s !== "api" && !/^\d+$/.test(s));
  return segment ? segment.toLowerCase() : "unknown";
};
