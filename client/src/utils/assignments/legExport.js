import ExcelJS from "exceljs"

/**
 * Exports one assignment leg as a load sheet the subcontractor can be sent:
 * a header block of instruction/route/subbie detail, then one row per item the
 * leg is carrying (containers, or the instruction's weight entries for break
 * bulk, which is assigned whole rather than per entry).
 *
 * Client-side only — everything shown here already came down with the group.
 */

const LABEL_COL = 1
const VALUE_COL = 2

const BORDER = { style: "thin", color: { argb: "FFD0D5DD" } }

const money = (n) => (Number(n) > 0 ? Number(n) : 0)

const safeFilePart = (s) =>
  String(s || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 60) || "assignment"

export async function exportLegToExcel({ leg, instruction, group }) {
  const workbook = new ExcelJS.Workbook()
  workbook.created = new Date()
  workbook.modified = new Date()

  const sheet = workbook.addWorksheet("Load Sheet")
  sheet.columns = [
    { width: 26 },
    { width: 34 },
    { width: 16 },
    { width: 40 },
  ]

  const title = sheet.addRow(["Subcontractor Load Sheet"])
  title.font = { size: 14, bold: true }
  sheet.mergeCells(title.number, 1, title.number, 4)
  sheet.addRow([])

  const detail = [
    ["Client", group?.client_name],
    ["Group Reference", group?.group_ref],
    ["Company File Reference", instruction?.ksmFileRef],
    ["Client File Reference", instruction?.clientFileRef],
    ["Booking Reference", instruction?.booking_ref],
    ["Vessel", instruction?.vessel_name],
    ["Shipment Type", instruction?.shipmenttype],
    ["Pickup", instruction?.pickup],
    ["Drop-Off", instruction?.dropoff],
    ["Subcontractor", leg?.subbieName],
    ["Route", leg?.startingpoint && leg?.destination ? `${leg.startingpoint} → ${leg.destination}` : null],
    ["Date", leg?.legDate ? String(leg.legDate).split("T")[0] : null],
  ]

  for (const [label, value] of detail) {
    const row = sheet.addRow([label, value || "—"])
    row.getCell(LABEL_COL).font = { bold: true }
    row.getCell(VALUE_COL).alignment = { wrapText: true }
  }

  const rateRow = sheet.addRow(["Subcontractor Rate", money(leg?.driverrate)])
  rateRow.getCell(LABEL_COL).font = { bold: true }
  rateRow.getCell(VALUE_COL).numFmt = "R #,##0.00"

  sheet.addRow([])

  // Break bulk carries no container rows — the leg covers the instruction's
  // weight entries as a whole, so list those instead.
  const isBreakBulk = String(instruction?.shipment_type) === "4"
  const items = isBreakBulk ? instruction?.weightRows || [] : leg?.containers || []

  const headerValues = isBreakBulk
    ? ["DN Number", "Ticket Number", "Receipt Book Number", `Weight${instruction?.rateweight ? ` (${instruction.rateweight})` : ""}`]
    : ["Container Number", "Container Type", "Weight", "Cargo Description"]

  const header = sheet.addRow(headerValues)
  header.font = { bold: true }
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F7FB" } }
    cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER }
  })

  if (items.length === 0) {
    sheet.addRow([isBreakBulk ? "No weight entries" : "No containers on this assignment"])
  } else {
    for (const item of items) {
      const row = isBreakBulk
        ? sheet.addRow([
            item.ksm_dm_no || "—",
            item.ticket_no || "—",
            item.receipt_book_no || "—",
            item.weight ?? "—",
          ])
        : sheet.addRow([
            item.containernum || `#${item.containerkey}`,
            item.container_type || "—",
            item.weight ?? "—",
            item.cargo_description || "—",
          ])
      row.eachCell((cell) => {
        cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER }
      })
    }

    const countRow = sheet.addRow([
      isBreakBulk ? "Total weight entries" : "Total containers",
      items.length,
    ])
    countRow.getCell(LABEL_COL).font = { bold: true }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = downloadUrl
  link.download = `load-sheet-${safeFilePart(
    instruction?.ksmFileRef || instruction?.clientFileRef || instruction?.booking_ref || instruction?.m1key,
  )}-${safeFilePart(leg?.subbieName)}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}
