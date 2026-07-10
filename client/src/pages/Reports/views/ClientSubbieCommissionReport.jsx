"use client"
import { useEffect, useMemo, useState } from "react"
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

const percentFormatter = new Intl.NumberFormat("en-ZA", {
  style: "percent",
  minimumFractionDigits: 2,
})

const formatDate = (value) => {
  if (!value) return "—"
  try {
    const date = typeof value === "string" ? new Date(value) : value
    if (Number.isNaN(date.getTime())) return "—"
    return date.toLocaleDateString("en-ZA")
  } catch (error) {
    console.warn("Failed to format date", value, error)
    return "—"
  }
}

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

const ClientSubbieCommissionReport = () => {
  const currentDate = useMemo(() => new Date(), [])
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState("")
  const [selectedMonth, setSelectedMonth] = useState(monthNames[currentDate.getMonth()])
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString())
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState("summary")

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await api.get("/api/get-clients")
        setClients(response.data?.data || [])
      } catch (err) {
        console.error("Failed to load clients", err)
        setError(err.message || "Failed to load clients")
      }
    }

    fetchClients()
  }, [])

  const selectedClientName = useMemo(() => {
    if (!selectedClientId) return ""
    const match = clients.find((client) => String(client.m5clientkey) === String(selectedClientId))
    return match ? match.client : ""
  }, [clients, selectedClientId])

  const handleGenerateReport = async () => {
    if (!selectedClientId) {
      setError("Please choose a client before generating the report.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await api.get("/api/client-subbie-commission", {
        params: {
          clientId: selectedClientId,
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

      const summarySheet = workbook.addWorksheet("Summary")
      summarySheet.columns = [
        { header: "Metric", key: "metric", width: 32 },
        { header: "Amount", key: "amount", width: 24 },
      ]
      summarySheet.addRow({ metric: "Client", amount: reportData.client?.name || selectedClientName || "Unknown" })
      summarySheet.addRow({ metric: "Period", amount: `${selectedMonth} ${selectedYear}` })
      summarySheet.addRow({})
      summarySheet.addRow({ metric: "Instruction Invoices", amount: (reportData.totals?.invoiceAmount || 0) - (reportData.totals?.addOnAmount || 0) })
      summarySheet.addRow({ metric: "Add-On Invoices", amount: reportData.totals?.addOnAmount || 0 })
      summarySheet.addRow({ metric: "Total Invoiced", amount: reportData.totals?.invoiceAmount || 0 })
      summarySheet.addRow({ metric: "Total Subbie Earnings", amount: reportData.totals?.subcontractorAmount || 0 })
      summarySheet.addRow({ metric: "KSM Commission", amount: reportData.totals?.commission || 0 })
      summarySheet.getColumn("amount").numFmt = "R #,##0.00"

      const subbiesSheet = workbook.addWorksheet("Subcontractors")
      subbiesSheet.columns = [
        { header: "Subcontractor", key: "companyName", width: 32 },
        { header: "Reg Number", key: "registrationNumber", width: 22 },
        { header: "Legs", key: "legCount", width: 12 },
        { header: "Total Earned", key: "totalEarned", width: 20 },
        { header: "Share %", key: "percentage", width: 12 },
      ]
      ;(reportData.subcontractors || []).forEach((subbie) => {
        subbiesSheet.addRow({
          companyName: subbie.companyName,
          registrationNumber: subbie.registrationNumber || "—",
          legCount: subbie.legCount,
          totalEarned: subbie.totalEarned,
          percentage: subbie.percentage,
        })
      })
      subbiesSheet.getColumn("totalEarned").numFmt = "R #,##0.00"
      subbiesSheet.getColumn("percentage").numFmt = "0.00%"

      const invoicesSheet = workbook.addWorksheet("Invoices")
      invoicesSheet.columns = [
        { header: "Type", key: "source", width: 14 },
        { header: "Invoice #", key: "invoiceNumber", width: 18 },
        { header: "Instruction", key: "instructionId", width: 16 },
        { header: "Date", key: "invoiceDate", width: 16 },
        { header: "Description", key: "description", width: 30 },
        { header: "Amount", key: "amount", width: 18 },
      ]
      ;(reportData.invoices || []).forEach((invoice) => {
        invoicesSheet.addRow({
          source: invoice.source === "addOn" ? "Add-On" : "Instruction",
          invoiceNumber: invoice.invoiceNumber || "—",
          instructionId: invoice.instructionId || "—",
          invoiceDate: formatDate(invoice.invoiceDate),
          description: invoice.description || "—",
          amount: invoice.amount || 0,
        })
      })
      invoicesSheet.getColumn("amount").numFmt = "R #,##0.00"

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      const safeClientName = (reportData.client?.name || selectedClientName || "Client")
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase()
      link.href = downloadUrl
      link.download = `client-subbie-commission-${safeClientName}-${selectedMonth}-${selectedYear}.xlsx`
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

  const totals = reportData?.totals || { invoiceAmount: 0, subcontractorAmount: 0, commission: 0, addOnAmount: 0 }
  const instructionInvoiceAmount = Math.max((totals.invoiceAmount || 0) - (totals.addOnAmount || 0), 0)
  const hasReportContent = Boolean(reportData && (reportData.invoices?.length || reportData.subcontractors?.length))

  return (
    <div className="client-subbie-report-page">
      <section className="client-subbie-intro">
        <p className="client-subbie-report-subtitle">
          Select a client and month to see subcontractor earnings alongside KSM commission for that period.
        </p>
      </section>

      <section className="client-subbie-toolbar">
        <div className="client-subbie-filters">
          <div className="client-subbie-filter-card">
            <label htmlFor="client-select">Client</label>
            <select
              id="client-select"
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
            >
              <option value="">Select a client…</option>
              {clients.map((client) => (
                <option key={client.m5clientkey} value={client.m5clientkey}>
                  {client.client}
                </option>
              ))}
            </select>
          </div>

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
      {hasReportContent && !loading && (
        <div className="client-subbie-tabs" role="tablist" aria-label="Report sections">
          <button
            type="button"
            className={`client-subbie-tab ${activeTab === "summary" ? "is-active" : ""}`}
            onClick={() => setActiveTab("summary")}
            role="tab"
            aria-selected={activeTab === "summary"}
          >
            Summary
          </button>
          <button
            type="button"
            className={`client-subbie-tab ${activeTab === "subbies" ? "is-active" : ""}`}
            onClick={() => setActiveTab("subbies")}
            role="tab"
            aria-selected={activeTab === "subbies"}
          >
            Subcontractors
          </button>
          <button
            type="button"
            className={`client-subbie-tab ${activeTab === "invoices" ? "is-active" : ""}`}
            onClick={() => setActiveTab("invoices")}
            role="tab"
            aria-selected={activeTab === "invoices"}
          >
            Invoices
          </button>
        </div>
      )}

      {!loading && reportData && (
        <>
          {activeTab === "summary" && (
            <section className="client-subbie-section" aria-label="Revenue summary">
              <header>
                <h2>Revenue Summary</h2>
                <p>
                  Totals include VAT from invoice instructions and reflect the earnings split for the selected period.
                </p>
              </header>
              <div className="client-subbie-summary">
                <div className="client-subbie-summary-card">
                  <span className="client-subbie-summary-label">Instruction Invoices</span>
                  <span className="client-subbie-summary-value">{formatCurrency(instructionInvoiceAmount)}</span>
                  <span className="client-subbie-summary-footnote">
                    Value of transport instructions billed directly for {selectedClientName || "the client"}.
                  </span>
                </div>
                <div className="client-subbie-summary-card">
                  <span className="client-subbie-summary-label">Add-On Invoices</span>
                  <span className="client-subbie-summary-value">{formatCurrency(totals.addOnAmount || 0)}</span>
                  <span className="client-subbie-summary-footnote">
                    Ancillary services raised outside the instruction invoices (VAT already applied).
                  </span>
                </div>
                <div className="client-subbie-summary-card">
                  <span className="client-subbie-summary-label">Total Invoiced Amount</span>
                  <span className="client-subbie-summary-value">{formatCurrency(totals.invoiceAmount)}</span>
                  <span className="client-subbie-summary-footnote">
                    Combined instruction and add-on invoices for the selected month.
                  </span>
                </div>
                <div className="client-subbie-summary-card">
                  <span className="client-subbie-summary-label">Total Subbie Earnings</span>
                  <span className="client-subbie-summary-value">{formatCurrency(totals.subcontractorAmount)}</span>
                  <span className="client-subbie-summary-footnote">
                    Combined driver rates for subcontractors engaged on those instructions.
                  </span>
                </div>
                <div className="client-subbie-summary-card">
                  <span className="client-subbie-summary-label">KSM Commission</span>
                  <span className="client-subbie-summary-value">{formatCurrency(totals.commission)}</span>
                  <span className="client-subbie-summary-footnote">
                    Displayed as an absolute value (Total invoiced minus subbie earnings).
                  </span>
                </div>
              </div>
            </section>
          )}

          {activeTab === "subbies" && (
            <section className="client-subbie-section" aria-label="Subcontractor breakdown">
              <header>
                <h2>Subcontractor Breakdown</h2>
                <p>Understand how subcontractor earnings contribute to the selected client period.</p>
              </header>
              <div className="client-subbie-card">
                {reportData.subcontractors?.length ? (
                  <div className="client-subbie-table-wrapper">
                    <table className="client-subbie-table">
                      <thead>
                        <tr>
                          <th>Subcontractor</th>
                          <th>Reg Number</th>
                          <th>Legs</th>
                          <th>Total Earned</th>
                          <th>Share of Subbie Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.subcontractors.map((subbie) => (
                          <tr key={`${subbie.subcontractorId}-${subbie.registrationNumber || "na"}`}>
                            <td>{subbie.companyName}</td>
                            <td>{subbie.registrationNumber || "—"}</td>
                            <td>{subbie.legCount}</td>
                            <td>{formatCurrency(subbie.totalEarned)}</td>
                            <td>
                              {subbie.percentage
                                ? percentFormatter.format(subbie.percentage)
                                : "0.00%"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="client-subbie-empty-state">
                    No subcontractor legs were billed for this client during {selectedMonth} {selectedYear}.
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "invoices" && (
            <section className="client-subbie-section" aria-label="Invoices and instructions">
              <header>
                <h2>Invoices & Instructions</h2>
                <p>Trace gross invoice totals with their linked documentation for auditing.</p>
              </header>
              <div className="client-subbie-card">
                {reportData.invoices?.length ? (
                  <div className="client-subbie-table-wrapper">
                    <table className="client-subbie-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Invoice</th>
                          <th>Instruction</th>
                          <th>Date</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.invoices.map((invoice) => (
                          <tr key={invoice.invoiceId}>
                            <td>{invoice.source === "addOn" ? "Add-On" : "Instruction"}</td>
                            <td>{invoice.invoiceNumber || "—"}</td>
                            <td>{invoice.instructionId || "—"}</td>
                            <td>{formatDate(invoice.invoiceDate)}</td>
                            <td>{formatCurrency(invoice.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="client-subbie-empty-state">
                    No invoices were raised for this client during {selectedMonth} {selectedYear}.
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {!loading && !reportData && !error && (
        <div className="client-subbie-download-note">
          Choose a client, month, and year, then click "Generate Report" to view subcontractor earnings and commission.
        </div>
      )}
    </div>
  )
}

export default ClientSubbieCommissionReport
