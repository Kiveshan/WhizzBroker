"use client"
import { useMemo, useState } from "react"
import ExcelJS from "exceljs"
import api from "../../../api"
import "../css/clientSubbieReport.css"

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
})

const formatCurrency = (value = 0) => currencyFormatter.format(Number(value) || 0)

const getYearOptions = () => {
  const currentYear = new Date().getFullYear()
  return [currentYear, currentYear - 1, currentYear - 2].map((year) => year.toString())
}

const LoadingIndicator = () => (
  <div className="client-subbie-loading">
    <div />
    <div />
    <div />
    <span>Crunching the numbers…</span>
  </div>
)

const IncomePerClientReport = () => {
  const currentDate = useMemo(() => new Date(), [])
  const [selectedMonth, setSelectedMonth] = useState(monthNames[currentDate.getMonth()])
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString())
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [exporting, setExporting] = useState(false)

  const handleGenerateReport = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await api.get("/api/income-per-client", {
        params: {
          month: selectedMonth,
          year: selectedYear,
        },
      })
      setReportData(response.data?.data || null)
      if (!response.data?.data) {
        setError("No report data was returned for the selected period.")
      }
    } catch (err) {
      console.error("Failed to generate report", err)
      setReportData(null)
      setError(err.message || "Failed to generate report")
    } finally {
      setLoading(false)
    }
  }

  const handleExportToExcel = async () => {
    if (!reportData) return

    setExporting(true)
    try {
      const workbook = new ExcelJS.Workbook()
      workbook.created = new Date()
      workbook.modified = new Date()

      const sheet = workbook.addWorksheet("Income Per Client")
      sheet.columns = [
        { header: "Client", key: "clientName", width: 32 },
        { header: "Jobs", key: "jobCount", width: 12 },
        { header: "Invoice Income", key: "invoiceIncome", width: 20 },
        { header: "Add-On Income", key: "addOnIncome", width: 20 },
        { header: "Total Income", key: "totalIncome", width: 20 },
      ]
      ;(reportData.rows || []).forEach((row) => {
        sheet.addRow(row)
      })
      sheet.addRow({
        clientName: "Total",
        jobCount: reportData.totals?.jobCount || 0,
        invoiceIncome: reportData.totals?.invoiceIncome || 0,
        addOnIncome: reportData.totals?.addOnIncome || 0,
        totalIncome: reportData.totals?.totalIncome || 0,
      })
      sheet.getColumn("invoiceIncome").numFmt = "R #,##0.00"
      sheet.getColumn("addOnIncome").numFmt = "R #,##0.00"
      sheet.getColumn("totalIncome").numFmt = "R #,##0.00"

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `income-per-client-${selectedMonth}-${selectedYear}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error("Failed to export report", err)
      setError(err.message || "Failed to export to Excel")
    } finally {
      setExporting(false)
    }
  }

  const totals = reportData?.totals || { jobCount: 0, invoiceIncome: 0, addOnIncome: 0, totalIncome: 0 }
  const hasReportContent = Boolean(reportData?.rows?.length)

  return (
    <div className="client-subbie-report-page">
      <section className="client-subbie-intro">
        <p className="client-subbie-report-subtitle">
          Select a month to see how much income each client generated across instructions and add-ons.
        </p>
      </section>

      <section className="client-subbie-toolbar">
        <div className="client-subbie-filters">
          <div className="client-subbie-filter-card">
            <label htmlFor="month-select">Month</label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              {monthNames.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div className="client-subbie-filter-card">
            <label htmlFor="year-select">Year</label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
            >
              {getYearOptions().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="client-subbie-actions">
          <button className="primary" onClick={handleGenerateReport} disabled={loading}>
            {loading ? "Generating…" : "Generate Report"}
          </button>
          <button
            className="secondary"
            onClick={handleExportToExcel}
            disabled={!reportData || !hasReportContent || exporting}
          >
            {exporting ? "Preparing Excel…" : "Export to Excel"}
          </button>
        </div>
      </section>

      {error && <div className="client-subbie-download-note">{error}</div>}

      {loading && <LoadingIndicator />}

      {!loading && reportData && (
        <section className="client-subbie-section" aria-label="Income per client">
          <header>
            <h2>Income Per Client — {selectedMonth} {selectedYear}</h2>
            <p>Totals include VAT on instruction invoices, plus any add-on invoices raised in the period.</p>
          </header>
          <div className="client-subbie-summary">
            <div className="client-subbie-summary-card">
              <span className="client-subbie-summary-label">Total Jobs</span>
              <span className="client-subbie-summary-value">{totals.jobCount}</span>
              <span className="client-subbie-summary-footnote">
                Instructions invoiced across all clients this period.
              </span>
            </div>
            <div className="client-subbie-summary-card">
              <span className="client-subbie-summary-label">Total Invoice Income</span>
              <span className="client-subbie-summary-value">{formatCurrency(totals.invoiceIncome)}</span>
              <span className="client-subbie-summary-footnote">
                Instruction invoices, including group invoices.
              </span>
            </div>
            <div className="client-subbie-summary-card">
              <span className="client-subbie-summary-label">Total Add-On Income</span>
              <span className="client-subbie-summary-value">{formatCurrency(totals.addOnIncome)}</span>
              <span className="client-subbie-summary-footnote">
                Ancillary services raised outside instruction invoices.
              </span>
            </div>
            <div className="client-subbie-summary-card">
              <span className="client-subbie-summary-label">Total Income</span>
              <span className="client-subbie-summary-value">{formatCurrency(totals.totalIncome)}</span>
              <span className="client-subbie-summary-footnote">
                Combined instruction and add-on income for the period.
              </span>
            </div>
          </div>

          <div className="client-subbie-card">
            {hasReportContent ? (
              <div className="client-subbie-table-wrapper">
                <table className="client-subbie-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Jobs</th>
                      <th>Invoice Income</th>
                      <th>Add-On Income</th>
                      <th>Total Income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.rows.map((row) => (
                      <tr key={row.clientId}>
                        <td>{row.clientName}</td>
                        <td>{row.jobCount}</td>
                        <td>{formatCurrency(row.invoiceIncome)}</td>
                        <td>{formatCurrency(row.addOnIncome)}</td>
                        <td>{formatCurrency(row.totalIncome)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="client-subbie-empty-state">
                No client income was recorded for {selectedMonth} {selectedYear}.
              </div>
            )}
          </div>
        </section>
      )}

      {!loading && !reportData && !error && (
        <div className="client-subbie-download-note">
          Choose a month and year, then click "Generate Report" to see income broken down by client.
        </div>
      )}
    </div>
  )
}

export default IncomePerClientReport
