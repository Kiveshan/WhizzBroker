"use client"

import { useCallback, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import ControllerInstructions from "./ControllerInstructions"
import { ConfirmationModal } from "../../../../components/instructions/ConfirmationModal"
import { saveInstructionGroup } from "../../../../services/instructionService"

/**
 * Grouped create-instruction page: one group holds several instructions
 * ("Instruction 1", "Instruction 2", …) that share a client and are saved
 * together. Each tab renders the existing create form in group mode; panels
 * stay mounted so switching tabs never loses state.
 */
const ControllerInstructionGroup = () => {
  const navigate = useNavigate()

  const idCounter = useRef(1)
  const [panels, setPanels] = useState([{ id: 1 }])
  const [activeId, setActiveId] = useState(1)
  const [groupClient, setGroupClient] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [confirmMessage, setConfirmMessage] = useState("")

  // Each panel re-registers fresh validate/buildPayload closures every render.
  const panelApis = useRef({})
  const registerPanel = useCallback(
    (panelId) => (api) => {
      panelApis.current[panelId] = api
    },
    [],
  )

  const clientIsLocked = panels.length > 1

  const handleClientSelected = useCallback((clientId) => {
    setGroupClient(clientId || null)
  }, [])

  const handleAddPanel = () => {
    if (!groupClient) {
      setSaveError("Select a client on the first instruction before adding another one.")
      return
    }
    setSaveError("")
    idCounter.current += 1
    const id = idCounter.current
    setPanels((prev) => [...prev, { id }])
    setActiveId(id)
  }

  const handleRemovePanel = (panelId) => {
    setPanels((prev) => {
      const remaining = prev.filter((p) => p.id !== panelId)
      if (activeId === panelId && remaining.length > 0) {
        setActiveId(remaining[remaining.length - 1].id)
      }
      return remaining
    })
    delete panelApis.current[panelId]
  }

  const performSave = useCallback(async () => {
    setIsSaving(true)
    setSaveError("")
    try {
      const instructions = []
      for (const panel of panels) {
        const api = panelApis.current[panel.id]
        const { instructionData, containerData, weightData } = await api.buildPayload()
        instructions.push({ controllerData: instructionData, containerData, weightData })
      }
      const result = await saveInstructionGroup(groupClient, instructions)
      if (result.success) {
        navigate("/ControllerDashboard")
      } else {
        throw new Error(result.message || "Failed to save instruction group")
      }
    } catch (error) {
      console.error("Error saving instruction group:", error)
      setSaveError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "An error occurred while saving the instruction group",
      )
    } finally {
      setIsSaving(false)
    }
  }, [panels, groupClient, navigate])

  const handleSave = async () => {
    setSaveError("")

    // Validate every panel; jump to the first one with problems.
    for (let i = 0; i < panels.length; i++) {
      const api = panelApis.current[panels[i].id]
      if (!api || !api.validate()) {
        setActiveId(panels[i].id)
        if (api) setSaveError(`Instruction ${i + 1} has missing or invalid fields.`)
        return
      }
    }

    // Rate/count mismatches are collected across panels into one confirmation.
    const mismatchMessages = []
    panels.forEach((panel, i) => {
      const { needsConfirmation, message } = panelApis.current[panel.id].getRateMismatch()
      if (needsConfirmation) mismatchMessages.push(`Instruction ${i + 1}: ${message}`)
    })
    if (mismatchMessages.length > 0) {
      setConfirmMessage(mismatchMessages.join("\n"))
      return
    }

    await performSave()
  }

  const activeIndex = panels.findIndex((p) => p.id === activeId)

  return (
    <div className="controller-instructions-unique-wrapper">
      <ConfirmationModal
        isOpen={!!confirmMessage}
        title="Confirm Submission"
        message={confirmMessage}
        onConfirm={async () => {
          setConfirmMessage("")
          await performSave()
        }}
        onCancel={() => setConfirmMessage("")}
      />

      <div className="controller-instructions-header">
        <button
          className="controller-instructions-back-button"
          onClick={() => navigate("/ControllerDashboard")}
        >
          Back
        </button>
      </div>

      {/* Tab bar: Instruction 1..N pills, + button, Save on the right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          maxWidth: "1200px",
          width: "calc(100% - 40px)",
          margin: "0 auto 16px",
        }}
      >
        {panels.map((panel, i) => (
          <div key={panel.id} style={{ display: "flex", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setActiveId(panel.id)}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                color: "white",
                backgroundColor: panel.id === activeId ? "#28a745" : "#9e9e9e",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Instruction {i + 1}
              {panels.length > 1 && (
                <span
                  role="button"
                  aria-label={`Remove instruction ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemovePanel(panel.id)
                  }}
                  style={{ fontWeight: 700, lineHeight: 1, cursor: "pointer" }}
                >
                  ×
                </span>
              )}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddPanel}
          title="Add another instruction to this group"
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "white",
            backgroundColor: "#4a90e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: "8px 24px",
            borderRadius: "6px",
            border: "none",
            cursor: isSaving ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "white",
            backgroundColor: "#28a745",
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>

      {saveError && (
        <div
          className="alert alert-danger"
          role="alert"
          style={{ maxWidth: "1200px", width: "calc(100% - 40px)", margin: "0 auto 16px" }}
        >
          {saveError}
        </div>
      )}

      {/* Panels stay mounted so tab switches never lose form state */}
      {panels.map((panel, i) => (
        <div key={panel.id} style={{ display: panel.id === activeId ? "block" : "none" }}>
          <ControllerInstructions
            groupMode
            lockedClient={i === 0 && !clientIsLocked ? null : groupClient}
            onClientSelected={i === 0 ? handleClientSelected : null}
            registerPanel={registerPanel(panel.id)}
          />
        </div>
      ))}

      {activeIndex === -1 && panels.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <button type="button" onClick={handleAddPanel}>
            Add an instruction
          </button>
        </div>
      )}
    </div>
  )
}

export default ControllerInstructionGroup
