import { formatRand } from "../../utils/instructions/instructionValue"

/**
 * "Instruction value" card: the instruction's billable breakdown, subtotal,
 * VAT and total. `value` comes from instructionValue(); this only renders it.
 * Shown on the create, edit and view screens.
 */
export function InstructionValueCard({ value, note }) {
  if (!value) return null

  const cell = { padding: "7px 10px", borderTop: "1px solid #eef0f3", fontSize: 14 }
  const num = { ...cell, textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }

  return (
    <div className="controller-instructions-form-section" data-testid="instruction-value">
      <div className="wb-card-header">
        <h4>Instruction value</h4>
        <p>
          {value.isAddOn
            ? "Add-ons are billed through the linked add-on invoice, not on the instruction."
            : "What this instruction will be invoiced for, updated as you edit."}
        </p>
      </div>

      {!value.isAddOn && (
        <>
          {value.lines.length === 0 ? (
            <p style={{ margin: "4px 0 12px", color: "#667085", fontSize: 14 }}>
              Choose a rate and add containers or weights to see the value.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {value.lines.map((line, i) => (
                    <tr key={`${line.label}-${i}`}>
                      <td style={cell}>{line.label}</td>
                      <td style={{ ...cell, color: "#667085" }}>{line.detail}</td>
                      <td style={num}>{formatRand(line.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...cell, fontWeight: 600 }} colSpan={2}>
                      Subtotal (excl. VAT)
                    </td>
                    <td style={{ ...num, fontWeight: 600 }}>{formatRand(value.subtotal)}</td>
                  </tr>
                  <tr>
                    <td style={cell} colSpan={2}>
                      VAT ({value.vatPercent}%)
                    </td>
                    <td style={num}>{formatRand(value.vatAmount)}</td>
                  </tr>
                  <tr style={{ background: "#f0f6ff" }}>
                    <td style={{ ...cell, fontWeight: 700, borderTop: "2px solid #4a90e2" }} colSpan={2}>
                      Total
                    </td>
                    <td style={{ ...num, fontWeight: 700, fontSize: 16, borderTop: "2px solid #4a90e2" }}>
                      {formatRand(value.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {note && <p style={{ margin: "8px 0 0", color: "#667085", fontSize: 13 }}>{note}</p>}
        </>
      )}
    </div>
  )
}
