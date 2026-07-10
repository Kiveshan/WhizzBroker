export default function SummaryModal({ show, legs, onClose }) {
  if (!show) return null;

  return (
    <div className="modal-wrapper">
      <div
        className="modal-backdrop animate-fadeIn"
        onClick={onClose}
      ></div>
      <div className="modal-container summary-modal-container animate-scaleIn">
        <div className="modal-header">
          <h3 className="modal-title">Instruction Summary</h3>
          <button
            type="button"
            className="modal-close"
            aria-label="Close summary"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          {legs && legs.length > 0 ? (
            <div className="summary-grid">
              {legs.map((leg) => {
                const start = leg.startingPoint || leg.startingpoint || "-";
                const dest = leg.destination || "-";
                const driversArr = Array.isArray(leg.drivers) ? leg.drivers : [];

                if (driversArr.length === 0) {
                  return (
                    <div
                      key={`leg-${leg.id || leg.legnumber}-empty`}
                      className="summary-leg-card"
                    >
                      <div className="summary-leg-header">
                        <span className="summary-leg-badge">Leg {leg.legnumber}</span>
                        <span className="summary-route">{start} → {dest}</span>
                      </div>
                      <div className="summary-rows">
                        <div className="summary-row">
                          <span className="label">Driver</span>
                          <span className="value">N/A</span>
                        </div>
                        <div className="summary-row">
                          <span className="label">Truck Reg</span>
                          <span className="value">N/A</span>
                        </div>
                        <div className="summary-row">
                          <span className="label">Container</span>
                          <span className="value">N/A</span>
                        </div>
                        <div className="summary-row">
                          <span className="label">Date</span>
                          <span className="value">N/A</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return driversArr.map((d, idx) => {
                  const driverName =
                    d.full_name ||
                    [d.driver_name, d.driver_surname].filter(Boolean).join(" ") ||
                    (d.driverid ? `Driver ID: ${d.driverid}` : "-");
                  const truck = d.truckregnumber || "-";
                  const containerNum =
                    d.containernumber !== null &&
                    d.containernumber !== undefined &&
                    d.containernumber !== ""
                      ? d.containernumber
                      : "-";
                  const typeRaw = (d.container_type || "").toString().toLowerCase();
                  const typeShort =
                    typeRaw === "six_meter" || typeRaw === "6m"
                      ? "6m"
                      : typeRaw === "twelve_meter" || typeRaw === "12m"
                      ? "12m"
                      : typeRaw === "abnormal"
                      ? "abnormal"
                      : d.container_type || "";
                  const containerDisplay =
                    containerNum !== "-"
                      ? `${typeShort ? `(${typeShort}) ` : " "}${containerNum}`
                      : "-";
                  const dateVal = d.date
                    ? new Date(d.date).toISOString().split("T")[0]
                    : "-";

                  return (
                    <div
                      key={`leg-${leg.id || leg.legnumber}-${idx}`}
                      className="summary-leg-card"
                    >
                      <div className="summary-leg-header">
                        <span className="summary-leg-badge">Leg {leg.legnumber}</span>
                        <span className="summary-route">{start} → {dest}</span>
                      </div>
                      <div className="summary-rows">
                        <div className="summary-row">
                          <span className="label">Driver</span>
                          <span className="value">{driverName}</span>
                        </div>
                        <div className="summary-row">
                          <span className="label">Truck Reg</span>
                          <span className="value">{truck}</span>
                        </div>
                        <div className="summary-row">
                          <span className="label">Container</span>
                          <span className="value">{containerDisplay}</span>
                        </div>
                        <div className="summary-row">
                          <span className="label">Date</span>
                          <span className="value">{dateVal}</span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          ) : (
            <div className="p-2 text-center">
              <span className="text-gray-700">No legs found for this instruction.</span>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="modal-btn modal-btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
