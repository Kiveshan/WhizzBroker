import { useState } from "react";
import api from "../../../api.js";

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

function SubcontractorBackfill() {
  const [fromYear, setFromYear] = useState(currentYear);
  const [fromMonth, setFromMonth] = useState(1);
  const [toYear, setToYear] = useState(currentYear);
  const [toMonth, setToMonth] = useState(currentMonth);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

  const handleRun = async () => {
    setRunning(true);
    setResults(null);
    setError(null);
    try {
      const res = await api.post("/subcontractor/backfill-statements", {
        fromYear,
        fromMonth,
        toYear,
        toMonth,
      });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Backfill failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ marginBottom: 4 }}>Subcontractor Statement Backfill</h2>
      <p style={{ color: "#666", marginBottom: 24, fontSize: 14 }}>
        Regenerates subcontractor statements for a date range, including legs
        with a R0 rate that were previously excluded.
      </p>

      <div style={{ display: "flex", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <label style={labelStyle}>From</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={fromMonth} onChange={(e) => setFromMonth(Number(e.target.value))} style={selectStyle}>
              {months.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <select value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))} style={selectStyle}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>To</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={toMonth} onChange={(e) => setToMonth(Number(e.target.value))} style={selectStyle}>
              {months.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <select value={toYear} onChange={(e) => setToYear(Number(e.target.value))} style={selectStyle}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <button onClick={handleRun} disabled={running} style={buttonStyle(running)}>
        {running ? "Running backfill…" : "Run Backfill"}
      </button>

      {error && (
        <div style={{ marginTop: 20, padding: 12, background: "#fff0f0", border: "1px solid #f5c2c2", borderRadius: 6, color: "#c0392b" }}>
          {error}
        </div>
      )}

      {results && (
        <div style={{ marginTop: 20 }}>
          <div style={{ padding: 12, background: "#f0fff4", border: "1px solid #a8e6bb", borderRadius: 6, color: "#1a7a3f", marginBottom: 12 }}>
            {results.message}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={thStyle}>Month</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {results.results.map((r) => (
                <tr key={r.month} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={tdStyle}>{r.month}</td>
                  <td style={{ ...tdStyle, color: r.success ? "#1a7a3f" : "#c0392b" }}>
                    {r.success ? "✓ OK" : "✗ Failed"}
                  </td>
                  <td style={tdStyle}>{r.success ? r.stats?.created ?? "-" : "-"}</td>
                  <td style={tdStyle}>{r.success ? r.stats?.updated ?? "-" : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, color: "#555", marginBottom: 6, fontWeight: 600 };
const selectStyle = { padding: "8px 10px", borderRadius: 4, border: "1px solid #ccc", fontSize: 14 };
const thStyle = { textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#444" };
const tdStyle = { padding: "8px 12px", color: "#333" };
const buttonStyle = (disabled) => ({
  padding: "10px 24px",
  background: disabled ? "#94c4a0" : "#2e7d32",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 15,
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 600,
});

export default SubcontractorBackfill;
