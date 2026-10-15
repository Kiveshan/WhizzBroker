"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../../css/controllerinstruction.css"
import FCcontrollerinstructions from "./FCcontrollerinstructions"
import ControllerInstructions from "../../createInstruction/views/ControllerInstructions"
import { ConfirmationModal } from "../../../../components/instructions/ConfirmationModal"
import {
  fetchInstructionGroup,
  addInstructionToGroup,
} from "../../../../services/instructionService"

/**
 * FC-side grouped instruction page: mirrors the controller's grouped create
 * page, but each existing tab is the FC update form for one child instruction.
 * The "+" tab renders the create form (in group mode) so the FC can append new
 * instructions to the same group without leaving the page.
 */
const FCcontrollerInstructionGroup = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const groupId = location.state?.groupId
  const initialInstructionId = location.state?.instructionId
  const listState = {
    clientId: location.state?.clientId,
    clientName: location.state?.clientName,
    selectedMonth: location.state?.selectedMonth,
    selectedYear: location.state?.selectedYear,
    activeFilter: location.state?.activeFilter,
  }

  const [group, setGroup] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  // Active tab: a child m1key (number/string) or a "new-N" panel id.
  const [activeTab, setActiveTab] = useState(null)
  const [newPanels, setNewPanels] = useState([])
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [saveError, setSaveError] = useState("")
  // Rate/count mismatch confirmation before saving a new instruction.
  const [pendingSave, setPendingSave] = useState(null)

  const newPanelCounter = useRef(0)
  const panelApis = useRef({})
  const registerPanel = useCallback(
    (panelId) => (api) => {
      panelApis.current[panelId] = api
    },
    [],
  )

  const goBackToList = useCallback(() => {
    navigate("/instructions", { state: listState })
    // listState is derived from location.state which is stable for this page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  const loadGroup = useCallback(
    async (focusInstructionId) => {
      try {
        setIsLoading(true)
        setLoadError("")
        const data = await fetchInstructionGroup(groupId)
        setGroup(data)
        const children = data?.instructions || []
        if (children.length > 0) {
          const focused = children.find(
            (i) => String(i.m1key) === String(focusInstructionId),
          )
          setActiveTab(focused ? focused.m1key : children[0].m1key)
        }
        return data
      } catch (error) {
        console.error("Error loading instruction group:", error)
        setLoadError(
          error.response?.data?.error ||
            error.message ||
            "Failed to load the instruction group.",
        )
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [groupId],
  )

  useEffect(() => {
    if (!groupId) {
      goBackToList()
      return
    }
    loadGroup(initialInstructionId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const handleAddPanel = () => {
    setSaveError("")
    newPanelCounter.current += 1
    const id = `new-${newPanelCounter.current}`
    setNewPanels((prev) => [...prev, { id }])
    setActiveTab(id)
  }

  const handleRemoveNewPanel = (panelId) => {
    setNewPanels((prev) => {
      const remaining = prev.filter((p) => p.id !== panelId)
      if (activeTab === panelId) {
        const children = group?.instructions || []
        setActiveTab(
          remaining.length > 0
            ? remaining[remaining.length - 1].id
            : children.length > 0
              ? children[children.length - 1].m1key
              : null,
        )
      }
      return remaining
    })
    delete panelApis.current[panelId]
  }

  // A child was deleted from inside its (embedded) update form.
  const handleChildDeleted = useCallback(async () => {
    const data = await loadGroup()
    if (!data || (data.instructions || []).length === 0) {
      goBackToList()
    }
  }, [loadGroup, goBackToList])

  const performSaveNew = async (panelId) => {
    const api = panelApis.current[panelId]
    if (!api) return
    setIsSavingNew(true)
    setSaveError("")
    try {
      const { instructionData, containerData, weightData } = await api.buildPayload()
      const result = await addInstructionToGroup(
        groupId,
        instructionData,
        containerData,
        weightData,
      )
      if (!result.success) {
        throw new Error(result.message || "Failed to add the instruction to the group")
      }
      // Promote the draft panel to a real child tab.
      setNewPanels((prev) => prev.filter((p) => p.id !== panelId))
      delete panelApis.current[panelId]
      await loadGroup(result.m1key)
    } catch (error) {
      console.error("Error adding instruction to group:", error)
      setSaveError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "An error occurred while adding the instruction to the group",
      )
    } finally {
      setIsSavingNew(false)
    }
  }

  const handleSaveNew = async (panelId) => {
    setSaveError("")
    const api = panelApis.current[panelId]
    if (!api || !api.validate()) {
      setActiveTab(panelId)
      if (api) setSaveError("The new instruction has missing or invalid fields.")
      return
    }
    const { needsConfirmation, message } = api.getRateMismatch()
    if (needsConfirmation) {
      setPendingSave({ panelId, message })
      return
    }
    await performSaveNew(panelId)
  }

  const children = group?.instructions || []

  const pillStyle = (isActive) => ({
    padding: "8px 18px",
    borderRadius: "20px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
    color: "white",
    backgroundColor: isActive ? "#28a745" : "#9e9e9e",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  })

  if (isLoading && !group) {
    return (
      <div className="controller-instructions-unique-wrapper">
        <p style={{ textAlign: "center", padding: "40px" }}>
          Loading instruction group...
        </p>
      </div>
    )
  }

  if (loadError && !group) {
    return (
      <div className="controller-instructions-unique-wrapper">
        <div
          className="alert alert-danger"
          role="alert"
          style={{ maxWidth: "1200px", width: "calc(100% - 40px)", margin: "40px auto" }}
        >
          {loadError}
        </div>
        <div style={{ textAlign: "center" }}>
          <button
            className="controller-instructions-back-button"
            onClick={goBackToList}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="controller-instructions-unique-wrapper">
      <ConfirmationModal
        isOpen={!!pendingSave}
        title="Confirm Submission"
        message={pendingSave?.message || ""}
        onConfirm={async () => {
          const panelId = pendingSave.panelId
          setPendingSave(null)
          await performSaveNew(panelId)
        }}
        onCancel={() => setPendingSave(null)}
      />

      <div className="controller-instructions-header">
        <button
          className="controller-instructions-back-button"
          onClick={goBackToList}
        >
          Back
        </button>
      </div>

      {/* Tab bar: one pill per child instruction, drafts, + button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          maxWidth: "1200px",
          width: "calc(100% - 40px)",
          margin: "0 auto 16px",
        }}
      >
        <span style={{ fontWeight: 700 }}>
          Group {group?.group_ref || group?.group_key}
          {group?.client_name ? ` — ${group.client_name}` : ""}
        </span>
        {children.map((child) => (
          <button
            key={child.m1key}
            type="button"
            onClick={() => setActiveTab(child.m1key)}
            style={pillStyle(String(activeTab) === String(child.m1key))}
          >
            Instruction {child.m1key}
          </button>
        ))}
        {newPanels.map((panel, i) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => setActiveTab(panel.id)}
            style={pillStyle(activeTab === panel.id)}
          >
            New Instruction {newPanels.length > 1 ? i + 1 : ""}
            <span
              role="button"
              aria-label="Discard new instruction"
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveNewPanel(panel.id)
              }}
              style={{ fontWeight: 700, lineHeight: 1, cursor: "pointer" }}
            >
              ×
            </span>
          </button>
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
        {typeof activeTab === "string" && activeTab.startsWith("new-") && (
          <button
            type="button"
            onClick={() => handleSaveNew(activeTab)}
            disabled={isSavingNew}
            style={{
              padding: "8px 24px",
              borderRadius: "6px",
              border: "none",
              cursor: isSavingNew ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "0.95rem",
              color: "white",
              backgroundColor: "#28a745",
              opacity: isSavingNew ? 0.7 : 1,
            }}
          >
            {isSavingNew ? "Saving…" : "Add to Group"}
          </button>
        )}
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
      {children.map((child) => (
        <div
          key={child.m1key}
          style={{ display: String(activeTab) === String(child.m1key) ? "block" : "none" }}
        >
          <FCcontrollerinstructions
            instructionId={child.m1key}
            groupMode
            onAfterSave={() => loadGroup(child.m1key)}
            onAfterDelete={handleChildDeleted}
          />
        </div>
      ))}
      {newPanels.map((panel) => (
        <div
          key={panel.id}
          style={{ display: activeTab === panel.id ? "block" : "none" }}
        >
          <ControllerInstructions
            groupMode
            lockedClient={group?.client}
            registerPanel={registerPanel(panel.id)}
          />
        </div>
      ))}
    </div>
  )
}

export default FCcontrollerInstructionGroup
