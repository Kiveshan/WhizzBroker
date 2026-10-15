"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api.js";
import Pagination from "../../../components/Pagination";
import "../css/auditLogReport.css";

const PAGE_SIZE = 25;

// Entities are discovered from the data (the server returns the distinct
// entity_type values present), so a newly audited area shows up here without a
// front-end change. This map only supplies nicer labels for the ones we know.
const ENTITY_LABELS = {
  addon: "Add-ons",
  audit: "Audit log",
  auth: "Authentication",
  client: "Clients",
  client_rate: "Client rates",
  client_statement: "Client statements",
  company: "Companies",
  credit_note: "Credit notes",
  document: "Documents",
  driver_rate: "Driver rates",
  employee: "Employees",
  expense: "Expenses",
  expense_type: "Expense types",
  instruction: "Instructions",
  invoice: "Invoices",
  leg: "Legs",
  payment: "Payments",
  purchase_order: "Purchase orders",
  report: "Reports",
  statement: "Statements",
  subcontractor: "Subcontractors",
  subcontractor_statement: "Subcontractor statements",
  supplier: "Suppliers",
  trailer: "Trailers",
  truck: "Trucks",
  user: "Users",
  wage: "Wages",
};

const entityLabel = (value) =>
  ENTITY_LABELS[value] || value.replaceAll("_", " ");

// The audit table grows without bound, so the viewer opens on a recent window
// rather than the whole history: every query then rides the timestamp index
// instead of scanning years of rows. Clearing the date fields still shows
// everything — it is just no longer the default.
const DEFAULT_WINDOW_DAYS = 30;

const isoDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

// A short line for the table cell: changes that dropped to R0 first, capped so
// the row stays one line. The full list is in the expanded row.
const summariseChanges = (changes, max = 2) => {
  const ordered = [...changes.filter((c) => c.zeroed), ...changes.filter((c) => !c.zeroed)];
  const shown = ordered.slice(0, max).map((c) => `${c.label}: ${c.from} → ${c.to}`);
  const extra = ordered.length - shown.length;
  return shown.join("; ") + (extra > 0 ? ` (+${extra} more)` : "");
};

// A refused request is still logged under the action it *tried*, so without
// this badge "PENDING USERS VIEWED" reads as if the data was seen.
const OUTCOME_LABELS = {
  FAILURE: { text: "Failed", title: "The request failed — nothing was changed" },
  DENIED: { text: "Blocked", title: "The request was refused — no data was shown or changed" },
};

// Rows written before the label change say "Unauthenticated request".
const actorDisplay = (entry) => {
  if (entry.admin_id == null && (!entry.actor_name || entry.actor_name === "Unauthenticated request")) {
    return "Not signed in";
  }
  return entry.actor_name || (entry.admin_id != null ? `User ${entry.admin_id}` : "—");
};

// `embedded` drops the report-page chrome (back button, subtitle) for callers
// — like the Admin dashboard — that already provide their own frame. What the
// log contains is decided by the server from the caller's role: Admin gets the
// full trail with raw request data; Manager/Director get every action except
// internet-scanner noise and System Admin's own actions.
function AuditLogReport({ embedded = false }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [countIsCapped, setCountIsCapped] = useState(false);
  const [actionTypes, setActionTypes] = useState([]);
  const [entityTypes, setEntityTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState("");
  const [entityType, setEntityType] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [from, setFrom] = useState(() => isoDaysAgo(DEFAULT_WINDOW_DAYS));
  const [to, setTo] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const fetchAuditLog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/api/admin/audit-log", {
        params: {
          page,
          limit: PAGE_SIZE,
          actionType: actionType || undefined,
          entityType: entityType || undefined,
          search: search || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      });
      setItems(response.data.items);
      setTotalItems(response.data.totalItems);
      setCountIsCapped(Boolean(response.data.countIsCapped));
      setActionTypes(response.data.actionTypes || []);
      setEntityTypes(response.data.entityTypes || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [page, actionType, entityType, search, from, to]);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  // Reset to page 1 whenever a filter changes.
  const withPageReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const applySearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setActionType("");
    setEntityType("");
    setSearch("");
    setSearchInput("");
    setFrom(isoDaysAgo(DEFAULT_WINDOW_DAYS));
    setTo("");
    setPage(1);
  };

  const filtersActive =
    actionType || entityType || search || to || from !== isoDaysAgo(DEFAULT_WINDOW_DAYS);

  const formatTimestamp = (ts) =>
    new Date(ts).toLocaleString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className={`alr-wrapper ${embedded ? "alr-embedded" : ""}`}>
      {!embedded && (
        <>
          <div className="header-actions">
            <button onClick={() => navigate("/reports")} className="back-button">
              Back
            </button>
          </div>

          <p className="alr-subtitle">
            Every tracked action across the system — logins, approvals, edits and
            deletions — with who did it, when, and what happened. Click a row to
            see exactly what changed. Read-only.
          </p>
        </>
      )}

      <div className="alr-panel">
        <form className="alr-filters" onSubmit={applySearch}>
          <div className="alr-field">
            <label>Action</label>
            <select
              value={actionType}
              onChange={(e) => withPageReset(setActionType)(e.target.value)}
              aria-label="Filter by action"
            >
              <option value="">All actions</option>
              {actionTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="alr-field">
            <label>Entity</label>
            <select
              value={entityType}
              onChange={(e) => withPageReset(setEntityType)(e.target.value)}
              aria-label="Filter by entity"
            >
              <option value="">All entities</option>
              {entityTypes.map((type) => (
                <option key={type} value={type}>
                  {entityLabel(type)}
                </option>
              ))}
            </select>
          </div>

          <div className="alr-field">
            <label>From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => withPageReset(setFrom)(e.target.value)}
              aria-label="From date"
            />
          </div>
          <div className="alr-field">
            <label>To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => withPageReset(setTo)(e.target.value)}
              aria-label="To date"
            />
          </div>

          <div className="alr-field alr-field-search">
            <label>Search</label>
            <input
              type="text"
              placeholder="Instruction no., actor, target or details…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search audit log"
            />
          </div>

          <div className="alr-filter-actions">
            <button type="submit" className="alr-search-btn">Search</button>
            {filtersActive && (
              <button type="button" className="alr-clear-btn" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        </form>

        <div className="alr-summary-line">
          {countIsCapped ? (
            <>More than {totalItems.toLocaleString()} matching entries — narrow the date range to get an exact count.</>
          ) : (
            <>{totalItems.toLocaleString()} matching {totalItems === 1 ? "entry" : "entries"}.</>
          )}
          {from && !to && from === isoDaysAgo(DEFAULT_WINDOW_DAYS) && (
            <> Showing the last {DEFAULT_WINDOW_DAYS} days; clear the from-date to search all history.</>
          )}
        </div>

        {error && <div className="alr-error-banner">{error}</div>}

        {loading ? (
          <div className="alr-loading">
            <div className="alr-loading-bar" />
            <p>Loading audit log…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="alr-empty-state">
            <p>No audit entries match the current filters.</p>
          </div>
        ) : (
          <>
            <div className="alr-table-container">
              <table className="alr-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Actor</th>
                    <th>Target</th>
                    <th>Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((entry) => {
                    const changes = Array.isArray(entry.changes) ? entry.changes : null;
                    const hasZeroed = changes?.some((c) => c.zeroed);
                    // Admin rows carry the raw request, so there is always
                    // something to show; other viewers expand only for changes.
                    const expandable = Boolean(changes?.length || entry.metadata);
                    const expanded = expandedId === entry.audit_id;
                    const toggle = () => setExpandedId(expanded ? null : entry.audit_id);

                    return (
                      <Fragment key={entry.audit_id}>
                        <tr
                          className={`alr-row ${expandable ? "alr-row-expandable" : ""} ${expanded ? "alr-row-expanded" : ""}`}
                          onClick={expandable ? toggle : undefined}
                          onKeyDown={
                            expandable
                              ? (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    toggle();
                                  }
                                }
                              : undefined
                          }
                          tabIndex={expandable ? 0 : undefined}
                          aria-expanded={expandable ? expanded : undefined}
                        >
                          <td className="alr-timestamp">
                            {expandable && (
                              <span className="alr-chevron" aria-hidden="true">
                                {expanded ? "▾" : "▸"}
                              </span>
                            )}
                            {formatTimestamp(entry.timestamp)}
                          </td>
                          <td>
                            <span className="alr-action-badge">
                              {entry.action_type.replaceAll("_", " ")}
                            </span>
                            {OUTCOME_LABELS[entry.outcome] && (
                              <span
                                className="alr-outcome-badge"
                                title={OUTCOME_LABELS[entry.outcome].title}
                              >
                                {OUTCOME_LABELS[entry.outcome].text}
                              </span>
                            )}
                          </td>
                          <td>{entry.entity_type ? entityLabel(entry.entity_type) : "—"}</td>
                          <td>{actorDisplay(entry)}</td>
                          <td>{entry.target_name || entry.target_id || "—"}</td>
                          <td className={`alr-changes-cell ${hasZeroed ? "alr-zeroed" : ""}`}>
                            {changes
                              ? changes.length
                                ? summariseChanges(changes)
                                : "No changes"
                              : "—"}
                          </td>
                        </tr>

                        {expanded && (
                          <tr className="alr-detail-row">
                            <td colSpan={6}>
                              {changes?.length > 0 && (
                                <table className="alr-changes-table">
                                  <thead>
                                    <tr>
                                      <th>Field</th>
                                      <th>Before</th>
                                      <th>After</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {changes.map((c, i) => (
                                      <tr key={i} className={c.zeroed ? "alr-zeroed" : ""}>
                                        <td>{c.label}</td>
                                        <td className="alr-change-value">{c.from}</td>
                                        <td className="alr-change-value">{c.to}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {entry.metadata && (
                                <div className="alr-request">
                                  <div className="alr-request-line">
                                    {entry.http_method} {entry.request_path} → {entry.status_code}{" "}
                                    {entry.outcome}
                                    {entry.ip_address ? ` · ${entry.ip_address}` : ""}
                                  </div>
                                  <pre className="alr-request-data">
                                    {JSON.stringify(entry.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              totalRecords={totalItems}
              recordsPerPage={PAGE_SIZE}
              currentPage={page}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default AuditLogReport;
