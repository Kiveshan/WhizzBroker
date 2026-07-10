"use client";

import { useState, useEffect, useCallback } from "react";
import api from "../../../api.js";
import Pagination from "../../../components/Pagination";
import "../css/AuditLogViewer.css";

const PAGE_SIZE = 25;

// Human-friendly labels for the entity_type filter. Kept in sync with the
// entityType values written by server/utils/auditLogger.js call sites.
const ENTITY_TYPES = [
  { value: "", label: "All entities" },
  { value: "payment", label: "Payments" },
  { value: "invoice", label: "Invoices" },
  { value: "client_rate", label: "Client rates" },
  { value: "driver_rate", label: "Driver rates" },
  { value: "credit_note", label: "Credit notes" },
  { value: "instruction", label: "Instructions" },
];

function AuditLogViewer() {
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [actionTypes, setActionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState("");
  const [entityType, setEntityType] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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
      setActionTypes(response.data.actionTypes || []);
    } catch (err) {
      setError(err.message);
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

  const formatTimestamp = (ts) =>
    new Date(ts).toLocaleString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="audit-log-viewer">
      <h2>Audit Log</h2>

      <form className="audit-filters" onSubmit={applySearch}>
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

        <select
          value={entityType}
          onChange={(e) => withPageReset(setEntityType)(e.target.value)}
          aria-label="Filter by entity"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => withPageReset(setFrom)(e.target.value)}
          aria-label="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => withPageReset(setTo)(e.target.value)}
          aria-label="To date"
        />

        <input
          type="text"
          placeholder="Search target or details..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search audit log"
        />
        <button type="submit">Search</button>
      </form>

      {error && <div className="error">Error: {error}</div>}

      {loading ? (
        <div className="loading">Loading audit log...</div>
      ) : items.length === 0 ? (
        <div className="no-audit-entries">No audit entries match the current filters.</div>
      ) : (
        <>
          <table className="audit-log-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.audit_id}>
                  <td className="audit-timestamp">{formatTimestamp(entry.timestamp)}</td>
                  <td>
                    <span className="audit-action-badge">
                      {entry.action_type.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>{entry.entity_type || "—"}</td>
                  <td>{entry.actor_name || (entry.admin_id != null ? `User ${entry.admin_id}` : "—")}</td>
                  <td>{entry.target_name || entry.target_id || "—"}</td>
                  <td className="audit-details">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            totalRecords={totalItems}
            recordsPerPage={PAGE_SIZE}
            currentPage={page}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

export default AuditLogViewer;
