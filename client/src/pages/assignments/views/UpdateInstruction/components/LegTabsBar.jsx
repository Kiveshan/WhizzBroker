import { FaTruckFast } from "react-icons/fa6";
import Plus from "./Plus";

export default function LegTabsBar({
  legs,
  currentLagIndex,
  isCompleted,
  handleSelectLeg,
  handleRemoveLeg,
  onMoveLeg,
  shouldHideAddLegButton,
  handleAddLeg,
  hasUnsavedNewLeg,
  setShowSummaryModal,
  setShowInvoicePreview,
  handleFinaliseClick,
  navigate,
  clientId,
  instructionId,
  shipmentType,
}) {
  const indexedLegs = legs.map((leg, i) => ({ ...leg, originalIndex: i }));

  return (
    <>
      <div className="flex gap-4 mb-4" style={{ marginLeft: "15px" }}>
        {indexedLegs.map((leg) => {
          const origIdx = leg.originalIndex;
          let buttonClass = "px-4 py-2 rounded-md ";

          if (currentLagIndex === origIdx) {
            buttonClass += "bg-green-500 text-white";
          } else if (leg.isNew || leg.id?.toString().startsWith("temp-")) {
            buttonClass += "bg-yellow-200 text-gray-800";
          } else {
            buttonClass += "bg-gray-200 text-gray-800";
          }

          return (
            <div
              key={leg.id || origIdx}
              className="relative"
              draggable={!isCompleted}
              onDragStart={(e) => {
                if (isCompleted) return;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(origIdx));
              }}
              onDragOver={(e) => {
                if (isCompleted) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                if (isCompleted) return;
                e.preventDefault();
                const fromRaw = e.dataTransfer.getData("text/plain");
                const fromIndex = Number.parseInt(fromRaw, 10);
                if (!Number.isFinite(fromIndex)) return;
                if (typeof onMoveLeg === "function") {
                  onMoveLeg(fromIndex, origIdx);
                }
              }}
            >
              <button
                className={buttonClass}
                onClick={() => handleSelectLeg(origIdx)}
              >
                Leg {leg.legnumber || origIdx + 1}
                {leg.isNew || leg.id?.toString().startsWith("temp-") ? " *" : ""}
                {leg.drivers && leg.drivers.length > 0 && (
                  <span className="ml-2 text-xs flex items-center">
                    ({leg.drivers.length}{" "}
                    <FaTruckFast className="driver-icon" />)
                  </span>
                )}
              </button>
              {legs.length > 1 && !isCompleted && (
                <div
                  className="bin-icon-wrapper"
                  onClick={() => handleRemoveLeg(origIdx, leg.id)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-3 h-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
        {!shouldHideAddLegButton && (
          <Plus onClick={handleAddLeg} disabled={isCompleted || hasUnsavedNewLeg} />
        )}
      </div>

      {legs.length > 0 && (
        <div className="finalise-btn" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="summary-btn"
            onClick={() => setShowSummaryModal(true)}
            type="button"
          >
            Preview
          </button>
          <button
            className="summary-btn"
            type="button"
            onClick={() => setShowInvoicePreview(true)}
            disabled={!instructionId}
            title={!instructionId ? "No instruction selected" : "Preview Invoice"}
          >
            Preview Invoice
          </button>
          <button
            className="summary-btn"
            type="button"
            onClick={() => {
              navigate("/Upload-Instruction-Documents", {
                state: {
                  clientId,
                  instructionId,
                  isCompleted,
                  shipmentType,
                  allowFinish: false,
                  timestamp: Date.now(),
                },
                replace: true,
              });
            }}
            disabled={!instructionId}
            title={!instructionId ? "No instruction selected" : "Upload Documents"}
          >
            Upload
          </button>
          <button className="finalise-btn2" onClick={handleFinaliseClick} type="button">
            {isCompleted ? "Documents" : "Finalise"}
          </button>
        </div>
      )}
    </>
  );
}
