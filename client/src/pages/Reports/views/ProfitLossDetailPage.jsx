"use client"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import jsPDF from "jspdf"
import api from "../../../api.js"
import "../../invoices/css/InvoiceTemplate.css"
import "../css/ProfitLossEnhanced.css"

const ProfitLossDetailPage = () => {
    const { month, year } = useParams()
    const navigate = useNavigate()
    const [reportData, setReportData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [companyData, setCompanyData] = useState(null)

    // Helper function for readable currency formatting
    const formatCurrency = (amount) => {
        const num = Number(amount || 0)
        return num.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }

    useEffect(() => {
        if (month && year) {
            fetchReport()
            fetchCompanyDetails()
        }
    }, [month, year])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const response = await api.get("/profit-loss-report", {
                params: { month, year },
            })
            setReportData(response.data)
        } catch (error) {
            console.error("Error fetching report:", error)
            alert(`Failed to fetch report: ${error.message}`)
        }
        setLoading(false)
    }

    const fetchCompanyDetails = async () => {
        try {
            const response = await api.get("/company-details")
            setCompanyData(response.data)
        } catch (error) {
            console.error("Error fetching company details:", error)
            setCompanyData({ companyname: "Test" })
        }
    }

    const aggregateData = (details) => {
        const aggregated = (details || []).reduce((acc, item) => {
            const key = item?.source ?? "Unknown"
            const amt = Number(item?.amount ?? 0)
            acc[key] = (acc[key] || 0) + amt
            return acc
        }, {})
        return aggregated
    }

    const downloadPDF = () => {
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
        })

        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 20
        const contentWidth = pageWidth - margin * 2

        doc.setFillColor(66, 133, 244)
        doc.rect(0, 0, pageWidth, 35, "F")

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(22)
        doc.setFont("helvetica", "bold")
        const companyName = companyData?.companyname || 'N/A'
        doc.text(companyName, pageWidth / 2, 20, { align: "center" })

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 50)
        doc.text(`Report Period: ${month} ${year}`, pageWidth - margin, 50, { align: "right" })

        doc.setFillColor(52, 168, 83)
        doc.rect(margin, 60, contentWidth, 20, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(16)
        doc.setFont("helvetica", "bold")
        doc.text("INCOME & EXPENDITURE STATEMENT", margin + 10, 72)
        doc.text(`${year}`, pageWidth - margin - 10, 72, { align: "right" })

        doc.setDrawColor(52, 168, 83)
        doc.setLineWidth(1)
        doc.line(margin, 85, pageWidth - margin, 85)

        let yPos = 100
        doc.setTextColor(0, 0, 0)

        const addSectionHeader = (title, yPosition) => {
            doc.setFillColor(240, 248, 255)
            doc.rect(margin, yPosition - 5, contentWidth, 12, "F")
            doc.setDrawColor(66, 133, 244)
            doc.setLineWidth(0.5)
            doc.rect(margin, yPosition - 5, contentWidth, 12)

            doc.setFontSize(14)
            doc.setFont("helvetica", "bold")
            doc.setTextColor(66, 133, 244)
            doc.text(title, margin + 5, yPosition + 3)
            doc.text("Amount (R)", pageWidth - margin - 5, yPosition + 3, { align: "right" })
            return yPosition + 15
        }

        const addTableRow = (label, amount, yPosition, isBold = false, isTotal = false) => {
            if (yPosition > pageHeight - 40) {
                doc.addPage()
                yPosition = 30
            }

            if (isTotal) {
                doc.setFillColor(245, 245, 245)
                doc.rect(margin, yPosition - 3, contentWidth, 10, "F")
                doc.setDrawColor(100, 100, 100)
                doc.setLineWidth(0.3)
                doc.line(margin, yPosition - 3, pageWidth - margin, yPosition - 3)
                doc.line(margin, yPosition + 7, pageWidth - margin, yPosition + 7)
            }

            doc.setFontSize(11)
            doc.setFont("helvetica", isBold || isTotal ? "bold" : "normal")
            doc.setTextColor(0, 0, 0)

            doc.text(label, margin + (isTotal ? 5 : 10), yPosition + 2)
            doc.text(`R ${amount}`, pageWidth - margin - 5, yPosition + 2, { align: "right" })

            return yPosition + (isTotal ? 15 : 8)
        }

        yPos = addSectionHeader("INCOME", yPos)

        const profitAgg = aggregateData(reportData.profitDetails)
        Object.entries(profitAgg).forEach(([source, amount]) => {
            yPos = addTableRow(source, formatCurrency(amount), yPos)
        })

        const profitAggSum = Object.values(profitAgg).reduce((s, v) => s + Number(v || 0), 0)
        const totalProfitVal = (reportData.totalProfit ?? reportData.totalIncome ?? profitAggSum)
        yPos = addTableRow(
            "Total Income",
            formatCurrency(totalProfitVal),
            yPos,
            true,
            true
        )

        yPos += 15
        yPos = addSectionHeader("EXPENDITURE", yPos)

        const lossAgg = aggregateData(reportData.lossDetails)
        Object.entries(lossAgg).forEach(([source, amount]) => {
            yPos = addTableRow(source, formatCurrency(amount), yPos)
        })

        const lossAggSum = Object.values(lossAgg).reduce((s, v) => s + Number(v || 0), 0)
        const totalLossVal = (reportData.totalLoss ?? reportData.totalExpenses ?? lossAggSum)
        yPos = addTableRow(
            "Total Expenditure",
            formatCurrency(Math.abs(totalLossVal)),
            yPos,
            true,
            true
        )

        yPos += 15
        const net = (reportData.net ?? reportData.netProfit ?? (totalProfitVal - totalLossVal))
        const isProfit = net >= 0

        doc.setFillColor(isProfit ? (232, 245, 233) : (255, 235, 238))
        doc.rect(margin, yPos - 5, contentWidth, 20, "F")
        doc.setDrawColor(isProfit ? (76, 175, 80) : (244, 67, 54))
        doc.setLineWidth(2)
        doc.rect(margin, yPos - 5, contentWidth, 20)

        doc.setFontSize(16)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(isProfit ? (27, 94, 32) : (183, 28, 28))
        doc.text("NET PROFIT (LOSS)", margin + 10, yPos + 5)

        const netText = isProfit
            ? `R ${formatCurrency(net)}`
            : `R (${formatCurrency(Math.abs(net))})`
        doc.text(netText, pageWidth - margin - 10, yPos + 5, { align: "right" })

        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100, 100, 100)
        doc.text(`© ${new Date().getFullYear()} ${companyName}. All rights reserved.`, pageWidth / 2, pageHeight - 15, {
            align: "center",
        })
        doc.text(`Page 1 of 1`, pageWidth - margin, pageHeight - 10, { align: "right" })

        doc.save(`Income_Expenditure_Statement_${month}_${year}.pdf`)
    }

    const handleBack = () => {
        navigate("/profit-loss-reports")
    }

    if (loading) {
        return (
            <div className="pl-enhanced-wrapper">
                <div className="pl-enhanced-page">
                    <div className="pl-loading-error">
                        Loading Profit & Loss report for {month} {year}...
                    </div>
                </div>
            </div>
        )
    }

    if (!reportData) {
        return (
            <div className="pl-enhanced-wrapper">
                <div className="pl-enhanced-page">
                    <div className="pl-loading-error">
                        No data available for {month} {year}.
                    </div>
                    <div className="pl-enhanced-buttons">
                        <button className="pl-btn pl-back-btn" onClick={handleBack}>
                            Back
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const profitAgg = aggregateData(reportData.profitDetails)
    const lossAgg = aggregateData(reportData.lossDetails)
    const uiTotalProfitVal = (reportData.totalProfit ?? reportData.totalIncome ?? 
        Object.values(profitAgg).reduce((s, v) => s + Number(v || 0), 0))
    const uiTotalLossVal = (reportData.totalLoss ?? reportData.totalExpenses ?? 
        Object.values(lossAgg).reduce((s, v) => s + Number(v || 0), 0))
    const uiNet = (reportData.net ?? reportData.netProfit ?? (uiTotalProfitVal - uiTotalLossVal))

    return (
        <div className="pl-enhanced-wrapper">
            <div className="pl-enhanced-page">
                <div className="pl-enhanced-paper">
                    <div className="pl-company-header">
                        <div className="pl-company-name">{companyData?.companyname || "N/A"}</div>
                        <div className="pl-report-date">Date: {new Date().toLocaleDateString()}</div>
                    </div>

                    <div className="pl-title-section">
                        <div className="pl-title">Income & Expenditure Statement</div>
                        <div className="pl-period">
                            {month} - {year}
                        </div>
                    </div>

                    <div className="pl-section">
                        <table className="pl-section-table">
                            <thead className="pl-section-header">
                                <tr>
                                    <th>Income</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody className="pl-section-body">
                                {Object.entries(profitAgg).map(([source, amount], index) => (
                                    <tr key={index}>
                                        <td>{source}</td>
                                        <td>R {formatCurrency(amount)}</td>
                                    </tr>
                                ))}
                                <tr className="pl-total-row">
                                    <td>Total Income</td>
                                    <td>R {formatCurrency(uiTotalProfitVal)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="pl-section">
                        <table className="pl-section-table">
                            <thead className="pl-section-header">
                                <tr>
                                    <th>Expenditure</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody className="pl-section-body">
                                {Object.entries(lossAgg).map(([source, amount], index) => (
                                    <tr key={index}>
                                        <td>{source}</td>
                                        <td>R {formatCurrency(amount)}</td>
                                    </tr>
                                ))}
                                <tr className="pl-total-row">
                                    <td>Total Expenditure</td>
                                    <td>R {formatCurrency(Math.abs(uiTotalLossVal))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="pl-section pl-net-section">
                        <table className="pl-section-table">
                            <thead className="pl-section-header pl-net-header">
                                <tr>
                                    <th>Net Profit (Loss)</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody className="pl-section-body">
                                <tr>
                                    <td>Net Profit (Loss)</td>
                                    <td className={`pl-net-amount ${uiNet >= 0 ? "pl-profit" : "pl-loss"}`}>
                                        {uiNet >= 0
                                            ? `R ${formatCurrency(uiNet)}`
                                            : `R (${formatCurrency(Math.abs(uiNet))})`}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="pl-enhanced-buttons">
                    <button className="pl-btn pl-back-btn" onClick={handleBack}>
                        Back
                    </button>
                    <button className="pl-btn pl-download-btn" onClick={downloadPDF}>
                        Download
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ProfitLossDetailPage