"use client"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import ExcelJS from "exceljs"
import api from "../../../api"

const VatReconReportPage = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const currentYear = new Date().getFullYear().toString()
    const [selectedYear, setSelectedYear] = useState(currentYear)

    const handleMonthClick = async (month, year) => {
        setLoading(true)
        try {
            const response = await api.get("/api/vat-recon", {
                params: { month, year }
            })
            const data = response.data
            await generateExcelReport(data, month, year)
        } catch (error) {
            console.error("Failed to fetch VAT recon data:", error)
            alert("Failed to generate VAT report. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const generateExcelReport = async (data, month, year) => {
        setExporting(true)
        try {
            const workbook = new ExcelJS.Workbook()
            workbook.created = new Date()
            workbook.modified = new Date()
            
            // Define styles
            const headerStyle = {
                font: { bold: true, color: { argb: "FFFFFF" }, size: 12 },
                fill: { type: "pattern", pattern: "solid", fgColor: { argb: "2E75B6" } },
                alignment: { horizontal: "center", vertical: "middle" },
                border: { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
            }
            
            const totalStyle = {
                font: { bold: true, size: 11 },
                fill: { type: "pattern", pattern: "solid", fgColor: { argb: "D9E1F2" } },
                border: { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
            }

            // Sheet 1: Output VAT
            const outputVatSheet = workbook.addWorksheet("Output VAT")
            outputVatSheet.columns = [
                { header: "Client Name", key: "clientName", width: 35 },
                { header: "Total Cost", key: "totalCost", width: 20 },
                { header: "VAT Amount", key: "vatAmount", width: 20 },
            ]

            let totalOutputVat = 0
            let totalOutputCost = 0

            // Add title row for Output VAT
            outputVatSheet.mergeCells('A1:C1')
            outputVatSheet.getCell('A1').value = `Output VAT - ${month} ${year}`
            outputVatSheet.getCell('A1').font = { bold: true, size: 14, color: { argb: "2E75B6" } }
            outputVatSheet.getCell('A1').alignment = { horizontal: "center" }
            outputVatSheet.addRow([])

            // Add headers
            const headerRow = outputVatSheet.addRow({
                clientName: "Client Name",
                totalCost: "Total Cost",
                vatAmount: "VAT Amount",
            })
            headerRow.eachCell((cell, colNumber) => {
                cell.style = headerStyle
            })

            if (data.outputVat && data.outputVat.length > 0) {
                data.outputVat.forEach((item) => {
                    const vatAmount = (item.totalCost * item.vatRate) / 100
                    totalOutputVat += vatAmount
                    totalOutputCost += item.totalCost
                    const row = outputVatSheet.addRow({
                        clientName: item.clientName,
                        totalCost: item.totalCost,
                        vatAmount: vatAmount,
                    })
                    // Apply currency formatting
                    row.getCell(2).numFmt = "R #,##0.00"
                    row.getCell(3).numFmt = "R #,##0.00"
                    // Add borders
                    row.eachCell((cell) => {
                        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
                    })
                })
            }

            // Add totals row
            outputVatSheet.addRow([])
            const outputTotalRow = outputVatSheet.addRow({
                clientName: "TOTAL",
                totalCost: totalOutputCost,
                vatAmount: totalOutputVat,
            })
            outputTotalRow.eachCell((cell, colNumber) => {
                cell.style = totalStyle
                if (colNumber > 1) {
                    cell.numFmt = "R #,##0.00"
                }
            })

            // Sheet 2: Input VAT
            const inputVatSheet = workbook.addWorksheet("Input VAT")
            inputVatSheet.columns = [
                { header: "Date", key: "date", width: 15 },
                { header: "Expense Type", key: "expenseType", width: 30 },
                { header: "Total", key: "total", width: 20 },
                { header: "VAT", key: "vat", width: 20 },
            ]

            let totalInputVat = 0
            let totalInputCost = 0

            // Add title row for Input VAT
            inputVatSheet.mergeCells('A1:D1')
            inputVatSheet.getCell('A1').value = `Input VAT - ${month} ${year}`
            inputVatSheet.getCell('A1').font = { bold: true, size: 14, color: { argb: "2E75B6" } }
            inputVatSheet.getCell('A1').alignment = { horizontal: "center" }
            inputVatSheet.addRow([])

            // Add headers
            const inputHeaderRow = inputVatSheet.addRow({
                date: "Date",
                expenseType: "Expense Type",
                total: "Total",
                vat: "VAT",
            })
            inputHeaderRow.eachCell((cell) => {
                cell.style = headerStyle
            })

            if (data.inputVat && data.inputVat.length > 0) {
                data.inputVat.forEach((item) => {
                    totalInputVat += item.vat || 0
                    totalInputCost += item.total || 0
                    const row = inputVatSheet.addRow({
                        date: item.date,
                        expenseType: item.expenseType,
                        total: item.total,
                        vat: item.vat,
                    })
                    // Apply formatting
                    row.getCell(1).numFmt = "YYYY-MM-DD"
                    row.getCell(3).numFmt = "R #,##0.00"
                    row.getCell(4).numFmt = "R #,##0.00"
                    // Add borders
                    row.eachCell((cell) => {
                        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
                    })
                })
            }

            // Add subbie rates to Input VAT sheet (grouped by company)
            if (data.subbieRates && data.subbieRates.length > 0) {
                data.subbieRates.forEach((subbie) => {
                    const row = inputVatSheet.addRow({
                        date: "",
                        expenseType: subbie.expenseType,
                        total: subbie.total,
                        vat: subbie.vat,
                    })
                    totalInputCost += subbie.total
                    totalInputVat += subbie.vat
                    // Apply formatting
                    row.getCell(3).numFmt = "R #,##0.00"
                    row.getCell(4).numFmt = "R #,##0.00"
                    // Add borders
                    row.eachCell((cell) => {
                        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
                    })
                })
            }

            // Add totals row
            inputVatSheet.addRow([])
            const inputTotalRow = inputVatSheet.addRow({
                date: "",
                expenseType: "TOTAL",
                total: totalInputCost,
                vat: totalInputVat,
            })
            inputTotalRow.eachCell((cell, colNumber) => {
                cell.style = totalStyle
                if (colNumber > 2) {
                    cell.numFmt = "R #,##0.00"
                }
            })

            // Sheet 3: VAT Owed to SARS
            const vatOwedSheet = workbook.addWorksheet("VAT Owed to SARS")
            vatOwedSheet.columns = [
                { header: "Description", key: "description", width: 40 },
                { header: "Amount", key: "amount", width: 25 },
            ]

            const vatOwed = totalOutputVat - totalInputVat

            // Add title row for VAT Owed
            vatOwedSheet.mergeCells('A1:B1')
            vatOwedSheet.getCell('A1').value = `VAT Reconciliation - ${month} ${year}`
            vatOwedSheet.getCell('A1').font = { bold: true, size: 14, color: { argb: "2E75B6" } }
            vatOwedSheet.getCell('A1').alignment = { horizontal: "center" }
            vatOwedSheet.addRow([])

            // Add headers
            const owedHeaderRow = vatOwedSheet.addRow({
                description: "Description",
                amount: "Amount",
            })
            owedHeaderRow.eachCell((cell) => {
                cell.style = headerStyle
            })

            // Add data rows
            const outputRow = vatOwedSheet.addRow({
                description: "Total Output VAT (from clients)",
                amount: totalOutputVat,
            })
            outputRow.getCell(2).numFmt = "R #,##0.00"
            outputRow.eachCell((cell) => {
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
            })

            const inputRow = vatOwedSheet.addRow({
                description: "Total Input VAT (from expenses)",
                amount: totalInputVat,
            })
            inputRow.getCell(2).numFmt = "R #,##0.00"
            inputRow.eachCell((cell) => {
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }
            })

            vatOwedSheet.addRow([])
            const owedRow = vatOwedSheet.addRow({
                description: "VAT Owed to SARS (Output - Input)",
                amount: vatOwed,
            })
            owedRow.eachCell((cell, colNumber) => {
                cell.style = totalStyle
                if (colNumber === 2) {
                    cell.numFmt = "R #,##0.00"
                    // Color code based on value
                    if (vatOwed < 0) {
                        cell.font = { bold: true, color: { argb: "FF0000" } }
                    } else {
                        cell.font = { bold: true, color: { argb: "006100" } }
                    }
                }
            })

            if (vatOwed < 0) {
                const refundRow = vatOwedSheet.addRow({
                    description: "Note: Negative value indicates VAT refund due",
                    amount: "",
                })
                refundRow.font = { italic: true, color: { argb: "FF0000" }, size: 10 }
                refundRow.getCell(1).alignment = { vertical: "top" }
            }

            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            })
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = downloadUrl
            link.download = `VAT-Recon-${month}-${year}.xlsx`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(downloadUrl)
        } catch (err) {
            console.error("Failed to export report:", err)
            alert("Failed to generate Excel file. Please try again.")
        } finally {
            setExporting(false)
        }
    }

    // Generate months
    const months = [
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

    const handleBack = () => {
        navigate("/reports")
    }

    const getYearOptions = () => {
        const currentYear = new Date().getFullYear()
        const years = []
        for (let i = currentYear - 2; i <= currentYear + 1; i++) {
            years.push(i.toString())
        }
        return years
    }

    // Split months into two columns
    const firstHalfMonths = months.slice(0, 6)
    const secondHalfMonths = months.slice(6)

    return (
        <div className="wage-reports-wrapper">
            <div className="dashboard">
                <div className="header-actions">
                    <button onClick={handleBack} className="back-button">
                        Back
                    </button>
                </div>
                <div className="dropdown-container74">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="dropdown"
                    >
                        {getYearOptions().map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="dashboard-row">
                    <div className="button-column">
                        {firstHalfMonths.map((month, index) => (
                            <button
                                key={index}
                                className="filter-button"
                                onClick={() => handleMonthClick(month, selectedYear)}
                                disabled={loading || exporting}
                            >
                                {loading || exporting ? "Generating..." : month}
                            </button>
                        ))}
                    </div>
                    <div className="button-column">
                        {secondHalfMonths.map((month, index) => (
                            <button
                                key={index + 6}
                                className="filter-button"
                                onClick={() => handleMonthClick(month, selectedYear)}
                                disabled={loading || exporting}
                            >
                                {loading || exporting ? "Generating..." : month}
                            </button>
                        ))}
                    </div>
                </div>

                {(loading || exporting) && (
                    <div className="loading-text">
                        {loading ? "Fetching data..." : "Generating Excel..."}
                    </div>
                )}
            </div>
        </div>
    )
}

export default VatReconReportPage
