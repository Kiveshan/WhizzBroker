import ExcelJS from "exceljs"
import { loadBrandLogo, BRAND_LOGO_ASPECT } from "../brandLogo.js"

/**
 * Exports one assignment leg as a load sheet the subcontractor can be sent.
 *
 * Styled to match the group invoice document (GroupInvoiceDocument.jsx):
 * steel-blue banding, pale-blue table headers, Arial throughout — so a subbie
 * receiving both recognises them as the same company's paperwork.
 *
 * Client-side only: everything here already came down with the group.
 */

// Lifted from groupInvoiceDocStyles so the two documents cannot drift apart.
const BRAND = "FF4682B4" // #4682b4 section banding
const BRAND_SOFT = "FFB8D1F3" // #b8d1f3 table headers
const RULE = "FFDDDDDD" // #ddd borders
const INK = "FF101828"
const MUTED = "FF667085"

const FONT = "Arial"
const thin = { style: "thin", color: { argb: RULE } }
const boxed = { top: thin, left: thin, bottom: thin, right: thin }

const LAST_COL = 4

const safeFilePart = (s) =>
  String(s || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 60) || "assignment"

const clean = (v) => (v === null || v === undefined || v === "" ? "—" : v)

// Logo block at the top of the sheet, in pixels. Excel rows are sized in points,
// so the spacer rows below convert back at 0.75pt/px.
const LOGO_PX_WIDTH = 208
const LOGO_ROWS = 4

/**
 * Builds the workbook. Split from the download so it can be exercised outside a
 * browser (no Blob/document here) — exportLegToExcel below does the saving.
 *
 * `logo` is optional ({ base64, extension } from loadBrandLogo); without it the
 * sheet falls back to the text-only letterhead.
 */
export function buildLegWorkbook({ leg, instruction, group, logo = null }) {
  const company = group?.company || {}
  const isBreakBulk = String(instruction?.shipment_type) === "4"
  const items = isBreakBulk ? instruction?.weightRows || [] : leg?.containers || []

  const workbook = new ExcelJS.Workbook()
  workbook.creator = company.companyname || "WhizzBroker"
  workbook.created = new Date()
  workbook.modified = new Date()

  const sheet = workbook.addWorksheet("Load Sheet", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, margins: {
      left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3,
    } },
  })
  sheet.columns = [{ width: 28 }, { width: 34 }, { width: 18 }, { width: 42 }]

  // Every row inherits Arial; individual cells override size/weight below.
  const row = (values = []) => {
    const r = sheet.addRow(values)
    r.font = { name: FONT, size: 10, color: { argb: INK } }
    return r
  }

  const merge = (r, from = 1, to = LAST_COL) => sheet.mergeCells(r.number, from, r.number, to)

  // ── Letterhead ──
  // The logo floats over spacer rows: ExcelJS anchors images to the grid, so the
  // rows exist purely to reserve the vertical space it occupies.
  if (logo) {
    const logoPxHeight = Math.round(LOGO_PX_WIDTH / BRAND_LOGO_ASPECT)
    for (let i = 0; i < LOGO_ROWS; i += 1) {
      row([]).height = (logoPxHeight / LOGO_ROWS) * 0.75
    }

    const imageId = workbook.addImage({ base64: logo.base64, extension: logo.extension })
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: LOGO_PX_WIDTH, height: logoPxHeight },
      editAs: "oneCell",
    })
  }

  const nameRow = row([company.companyname || "Load Sheet"])
  nameRow.font = { name: FONT, size: 16, bold: true, color: { argb: INK } }
  nameRow.height = 22
  merge(nameRow)

  const addressLine = [company.address, company.suburb, company.cluster_box].filter(Boolean).join(", ")
  if (addressLine) {
    const r = row([addressLine])
    r.font = { name: FONT, size: 9, color: { argb: MUTED } }
    merge(r)
  }
  const contactLine = [
    company.phonenumber ? `Tel: ${company.phonenumber}` : null,
    company.vat_reg_num ? `VAT Reg: ${company.vat_reg_num}` : null,
  ]
    .filter(Boolean)
    .join("    ")
  if (contactLine) {
    const r = row([contactLine])
    r.font = { name: FONT, size: 9, color: { argb: MUTED } }
    merge(r)
  }

  row([])

  // ── Title band ──
  const title = row(["SUBCONTRACTOR LOAD SHEET"])
  title.height = 26
  merge(title)
  const titleCell = title.getCell(1)
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } }
  titleCell.font = { name: FONT, size: 13, bold: true, color: { argb: "FFFFFFFF" } }
  titleCell.alignment = { horizontal: "center", vertical: "middle" }

  row([])

  // ── Detail pairs, two per row so the sheet reads like the invoice header ──
  const sectionHeader = (label) => {
    const r = row([label])
    r.height = 20
    merge(r)
    const c = r.getCell(1)
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_SOFT } }
    c.font = { name: FONT, size: 10, bold: true, color: { argb: INK } }
    c.alignment = { vertical: "middle" }
    c.border = boxed
    return r
  }

  const pairRow = (leftLabel, leftValue, rightLabel, rightValue) => {
    const r = row([leftLabel, clean(leftValue), rightLabel, clean(rightValue)])
    for (const col of [1, 3]) {
      const c = r.getCell(col)
      c.font = { name: FONT, size: 9, bold: true, color: { argb: MUTED } }
      c.border = boxed
      c.alignment = { vertical: "middle" }
    }
    for (const col of [2, 4]) {
      const c = r.getCell(col)
      c.border = boxed
      c.alignment = { vertical: "middle", wrapText: true }
    }
    return r
  }

  sectionHeader("Instruction")
  pairRow("Client", group?.client_name, "Group Reference", group?.group_ref)
  pairRow("Company File Ref", instruction?.ksmFileRef, "Client File Ref", instruction?.clientFileRef)
  pairRow("Booking Reference", instruction?.booking_ref, "Vessel", instruction?.vessel_name)
  pairRow("Shipment Type", instruction?.shipmenttype, "Cargo", isBreakBulk ? "Break bulk" : "Containers")
  pairRow("Pickup", instruction?.pickup, "Drop-Off", instruction?.dropoff)

  row([])

  sectionHeader("Assignment")
  pairRow("Subcontractor", leg?.subbieName, "Date", leg?.legDate ? String(leg.legDate).split("T")[0] : null)
  pairRow(
    "Route",
    leg?.startingpoint && leg?.destination ? `${leg.startingpoint} → ${leg.destination}` : null,
    isBreakBulk ? "Weight Entries" : "Containers",
    items.length,
  )

  // Rate gets its own emphasised row — it is the number that gets queried.
  const rate = row(["Subcontractor Rate", Number(leg?.driverrate) || 0, "", ""])
  rate.getCell(1).font = { name: FONT, size: 9, bold: true, color: { argb: MUTED } }
  const rateValue = rate.getCell(2)
  rateValue.numFmt = 'R #,##0.00'
  rateValue.font = { name: FONT, size: 11, bold: true, color: { argb: INK } }
  for (let c = 1; c <= LAST_COL; c += 1) rate.getCell(c).border = boxed

  row([])

  // ── Item table ──
  const headers = isBreakBulk
    ? ["DN Number", "Ticket Number", "Receipt Book No.", `Weight${instruction?.rateweight ? ` (${instruction.rateweight})` : ""}`]
    : ["Container Number", "Container Type", "Weight", "Cargo Description"]

  const head = row(headers)
  head.height = 20
  head.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_SOFT } }
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: INK } }
    cell.border = boxed
    cell.alignment = { vertical: "middle" }
  })

  if (items.length === 0) {
    const empty = row([isBreakBulk ? "No weight entries" : "No containers on this assignment"])
    merge(empty)
    empty.getCell(1).font = { name: FONT, size: 10, italic: true, color: { argb: MUTED } }
    empty.getCell(1).border = boxed
  } else {
    items.forEach((item, i) => {
      const r = isBreakBulk
        ? row([clean(item.ksm_dm_no), clean(item.ticket_no), clean(item.receipt_book_no), item.weight ?? "—"])
        : row([
            clean(item.containernum || `#${item.containerkey}`),
            clean(item.container_type),
            item.weight ?? "—",
            clean(item.cargo_description),
          ])
      r.eachCell((cell) => {
        cell.border = boxed
        cell.alignment = { vertical: "middle", wrapText: true }
        // Banded rows: easier to follow across four columns on a printed page.
        if (i % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7FAFC" } }
        }
      })
    })

    const totalRow = row([isBreakBulk ? "Total weight entries" : "Total containers", items.length, "", ""])
    totalRow.getCell(1).font = { name: FONT, size: 10, bold: true, color: { argb: INK } }
    totalRow.getCell(2).font = { name: FONT, size: 10, bold: true, color: { argb: INK } }
    for (let c = 1; c <= LAST_COL; c += 1) {
      totalRow.getCell(c).border = boxed
      totalRow.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } }
    }
  }

  row([])

  // ── Sign-off, so the sheet doubles as a POD the driver can sign ──
  const signHead = sectionHeader("Acknowledgement")
  signHead.getCell(1).border = boxed
  const sign = row(["Driver Name", "", "Signature", ""])
  sign.height = 30
  sign.getCell(1).font = { name: FONT, size: 9, bold: true, color: { argb: MUTED } }
  sign.getCell(3).font = { name: FONT, size: 9, bold: true, color: { argb: MUTED } }
  for (let c = 1; c <= LAST_COL; c += 1) sign.getCell(c).border = boxed

  const footer = row([`Generated ${new Date().toLocaleDateString("en-ZA")} · ${company.companyname || ""}`])
  merge(footer)
  footer.getCell(1).font = { name: FONT, size: 8, italic: true, color: { argb: MUTED } }
  footer.getCell(1).alignment = { horizontal: "center" }

  // Freeze under the item-table header so long container lists stay readable.
  sheet.views = [{ state: "frozen", ySplit: head.number, showGridLines: false }]

  return workbook
}

export function legFileName({ leg, instruction }) {
  return `load-sheet-${safeFilePart(
    instruction?.ksmFileRef || instruction?.clientFileRef || instruction?.booking_ref || instruction?.m1key,
  )}-${safeFilePart(leg?.subbieName)}.xlsx`
}

export async function exportLegToExcel({ leg, instruction, group }) {
  // Null just means the sheet gets the text-only letterhead.
  const logo = await loadBrandLogo()
  const workbook = buildLegWorkbook({ leg, instruction, group, logo })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = downloadUrl
  link.download = legFileName({ leg, instruction })
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}
