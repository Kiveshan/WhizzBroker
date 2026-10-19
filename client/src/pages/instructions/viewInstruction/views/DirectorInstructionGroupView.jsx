"use client"

import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "../../css/controllerinstruction.css"
import Viewcontrollerinstructions from "./Viewcontrollerinstructions"
import { fetchInstructionGroup } from "../../../../services/instructionService"

/**
 * Director-side read-only grouped instruction view: mirrors
 * FCcontrollerInstructionGroup's tab bar, but every panel is the read-only
 * Viewcontrollerinstructions form and there is no add/edit/save affordance.
 */
const DirectorInstructionGroupView = () => {
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
  const [activeTab, setActiveTab] = useState(null)

  const goBackToList = () => {
    navigate("/CompanyInstructions", { state: listState })
  }

  useEffect(() => {
    if (!groupId) {
      goBackToList()
      return
    }

    const loadGroup = async () => {
      try {
        setIsLoading(true)
        setLoadError("")
        const data = await fetchInstructionGroup(groupId)
        setGroup(data)
        const children = data?.instructions || []
        if (children.length > 0) {
          const focused = children.find(
            (i) => String(i.m1key) === String(initialInstructionId),
          )
          setActiveTab(focused ? focused.m1key : children[0].m1key)
        }
      } catch (error) {
        console.error("Error loading instruction group:", error)
        setLoadError(
          error.response?.data?.error ||
            error.message ||
            "Failed to load the instruction group.",
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadGroup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

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
          <button className="controller-instructions-back-button" onClick={goBackToList}>
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="controller-instructions-unique-wrapper">
      <div className="controller-instructions-header">
        <button className="controller-instructions-back-button" onClick={goBackToList}>
          Back
        </button>
      </div>

      {/* Tab bar: one read-only pill per child instruction */}
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
        {children.map((childItem) => (
          <button
            key={childItem.m1key}
            type="button"
            onClick={() => setActiveTab(childItem.m1key)}
            style={pillStyle(String(activeTab) === String(childItem.m1key))}
          >
            Instruction {childItem.m1key}
          </button>
        ))}
      </div>

      {/* Panels stay mounted so tab switches don't refetch */}
      {children.map((childItem) => (
        <div
          key={childItem.m1key}
          style={{ display: String(activeTab) === String(childItem.m1key) ? "block" : "none" }}
        >
          <Viewcontrollerinstructions instructionId={childItem.m1key} groupMode />
        </div>
      ))}
    </div>
  )
}

export default DirectorInstructionGroupView
