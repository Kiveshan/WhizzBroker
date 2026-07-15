"use client"

import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import html2pdf from "html2pdf.js"
import { PDFDocument } from "pdf-lib"
import { fetchGroupInvoicePreview, fetchInstructionDocuments } from "../../../services/assignmentService"
import { GroupInvoiceDocument, groupInvoiceDocStyles } from "./GroupInvoiceDocument"

/** Sniffs the real file type from content bytes since uploaded documents are labelled by the user, not by filename. */
const detectFileType = (bytes) => {
  const b = new Uint8Array(bytes.slice(0, 4))
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "pdf" // %PDF
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png"
  if (b[0] === 0xff && b[1] === 0xd8) return "jpg"
  return null
}

/**
 * Full-page combined group invoice, opened from the invoices list for a
 * finalised group. Renders the shared GroupInvoiceDocument with back + a
 * download button that merges each child instruction's uploaded documents
 * into the generated invoice PDF.
 */
const GroupInvoiceView = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { groupId } = useParams()
  const sheetRef = useRef(null)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError("")
    fetchGroupInvoicePreview(groupId)
      .then((res) => {
        if (!alive) return
        if (res.success) setData(res.data)
        else setError(res.message || "Failed to load invoice")
      })
      .catch((e) => alive && setError(e.response?.data?.message || e.message || "Failed to load invoice"))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [groupId])

  const goBack = () => navigate("/invoices", { state: location.state })

  const handleDownload = async () => {
    if (!sheetRef.current || downloading) return
    setDownloading(true)
    try {
      const opt = {
        margin: 0.3,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      }
      const invoiceBytes = await html2pdf().set(opt).from(sheetRef.current).toPdf().output("arraybuffer")

      const mergedPdf = await PDFDocument.load(invoiceBytes)

      for (const child of data?.children || []) {
        let docs = []
        try {
          docs = await fetchInstructionDocuments(child.m1key)
        } catch (e) {
          console.error(`Failed to load documents for instruction ${child.m1key}`, e)
          continue
        }

        for (const doc of docs) {
          try {
            const res = await fetch(doc.url)
            const bytes = await res.arrayBuffer()
            const fileType = detectFileType(bytes)

            if (fileType === "pdf") {
              const attachedPdf = await PDFDocument.load(bytes)
              const pages = await mergedPdf.copyPages(attachedPdf, attachedPdf.getPageIndices())
              pages.forEach((page) => mergedPdf.addPage(page))
            } else if (fileType === "png" || fileType === "jpg") {
              const image = fileType === "png" ? await mergedPdf.embedPng(bytes) : await mergedPdf.embedJpg(bytes)
              const page = mergedPdf.addPage([image.width, image.height])
              page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
            } else {
              console.warn(`Skipping document "${doc.name}" — unrecognised file type`)
            }
          } catch (e) {
            console.error(`Failed to attach document "${doc.name}"`, e)
          }
        }
      }

      const mergedBytes = await mergedPdf.save()
      const blob = new Blob([mergedBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Group_Invoice_${data?.group?.invoiceNum || groupId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error("Failed to generate invoice PDF", e)
      alert("Failed to generate the invoice PDF. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="wb-ginv-page">
      <div className="wb-ginv-bar">
        <button className="wb-ginv-btn" onClick={goBack}>
          ← Back to Invoices
        </button>
        {!loading && !error && (
          <button className="wb-ginv-btn primary" onClick={handleDownload} disabled={downloading}>
            {downloading ? "Preparing…" : "⬇ Download PDF"}
          </button>
        )}
      </div>

      <div className="wb-ginv-sheet" ref={sheetRef}>
        {loading && <div className="wb-ginv-state">Loading invoice…</div>}
        {error && <div className="wb-ginv-state err">{error}</div>}
        {!loading && !error && data && <GroupInvoiceDocument data={data} />}
      </div>

      <style>{`
        .wb-ginv-page { min-height: 100vh; background: #eef8fa; padding: 20px; box-sizing: border-box; }
        .wb-ginv-bar { max-width: 860px; margin: 0 auto 16px; display: flex; justify-content: space-between; }
        .wb-ginv-btn { background: #fff; border: 1px solid #d0d5dd; border-radius: 8px; padding: 8px 16px; font-weight: 600; font-size: 13.5px; color: #344054; cursor: pointer; }
        .wb-ginv-btn.primary { background: #4aa8e0; border-color: #4aa8e0; color: #fff; }
        .wb-ginv-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .wb-ginv-sheet { max-width: 860px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(16,24,40,0.1); }
        .wb-ginv-state { padding: 60px; text-align: center; color: #667085; }
        .wb-ginv-state.err { color: #b42318; }
        @media print {
          .wb-ginv-page { background: #fff; padding: 0; }
          .wb-ginv-bar { display: none; }
          .wb-ginv-sheet { box-shadow: none; border-radius: 0; max-width: none; }
        }
        ${groupInvoiceDocStyles}
      `}</style>
    </div>
  )
}

export default GroupInvoiceView
