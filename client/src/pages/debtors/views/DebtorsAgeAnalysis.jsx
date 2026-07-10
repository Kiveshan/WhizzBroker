import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import "./DebtorsAgeAnalysis.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fmt = (val) =>
  `R ${Number(val).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DebtorsAgeAnalysis = () => {
  const navigate = useNavigate();
  const now = new Date();

  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear]   = useState(now.getFullYear().toString());
  const [data, setData]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const years = Array.from({ length: 6 }, (_, i) => (now.getFullYear() - i).toString());

  useEffect(() => {
    const loadAgeAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/api/debtor-age-analysis", { params: { month, year } });
        setData(res.data.data || []);
      } catch {
        setError("Failed to load age analysis data.");
      } finally {
        setLoading(false);
      }
    };
    loadAgeAnalysis();
  }, [month, year]);

  const totals = data.reduce(
    (acc, row) => ({
      current:    acc.current    + row.current,
      thirtyDays: acc.thirtyDays + row.thirtyDays,
      sixtyDays:  acc.sixtyDays  + row.sixtyDays,
      ninetyDays: acc.ninetyDays + row.ninetyDays,
    }),
    { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyDays: 0 }
  );
  const grandTotal = totals.current + totals.thirtyDays + totals.sixtyDays + totals.ninetyDays;

  return (
    <div className="age-analysis-container">
      <div className="age-analysis-header">
        <button className="back-button" onClick={() => navigate(-1)}>Back</button>
      </div>

      <div className="age-analysis-filters">
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading && <p className="age-analysis-status">Loading...</p>}
      {error   && <p className="age-analysis-status error">{error}</p>}

      {!loading && !error && data.length === 0 && (
        <p className="age-analysis-status">No outstanding debtors for this period.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="age-analysis-table-wrapper">
          <table className="age-analysis-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Current (0–30)</th>
                <th>31–60 Days</th>
                <th>61–90 Days</th>
                <th>90+ Days</th>
                <th>Total Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const total = row.current + row.thirtyDays + row.sixtyDays + row.ninetyDays;
                return (
                  <tr key={i}>
                    <td>{row.client}</td>
                    <td className="amount">{fmt(row.current)}</td>
                    <td className="amount">{fmt(row.thirtyDays)}</td>
                    <td className="amount">{fmt(row.sixtyDays)}</td>
                    <td className={`amount ${row.ninetyDays > 0 ? "overdue" : ""}`}>{fmt(row.ninetyDays)}</td>
                    <td className="amount total-col">{fmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td>Total</td>
                <td className="amount">{fmt(totals.current)}</td>
                <td className="amount">{fmt(totals.thirtyDays)}</td>
                <td className="amount">{fmt(totals.sixtyDays)}</td>
                <td className="amount">{fmt(totals.ninetyDays)}</td>
                <td className="amount total-col">{fmt(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default DebtorsAgeAnalysis;
