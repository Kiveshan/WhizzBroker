export default function RouteHeader({
  editedFields,
  formData,
  startingPoints,
  destinations,
  handleStartingPointChange,
  handleDestinationChange,
  drivers,
  isCompleted,
  legsLength,
  addDriverButtonRef,
  addDriver,
  handleSave,
  saving,
  currentLagIndex,
}) {
  return (
    <div className="bg-blue-50 p-6 rounded-md mb-4">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            maxWidth: "1000px",
            gap: "20px",
            justifyContent: "center",
            paddingLeft: "100px",
          }}
        >
          <div style={{ flex: 1, minWidth: "650px" }}>
            <label className="block text-gray-700 mb-2">
              Starting Point
              {editedFields.startingPoint && (
                <span className="ml-2 text-blue-500 text-xs">(edited)</span>
              )}
            </label>
            <div className="relative">
              <select
                className={`w-full p-2 border rounded-md appearance-none pr-10 ${
                  editedFields.startingPoint ? "border-blue-500" : ""
                }`}
                value={formData.startingPoint}
                onChange={handleStartingPointChange}
                disabled={isCompleted || legsLength === 0}
              >
                <option value="">Select starting point</option>
                {startingPoints.map((point) => (
                  <option key={point} value={point}>
                    {point}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: "650px" }}>
            <label className="block text-gray-700 mb-2">
              Destination
              {editedFields.destination && (
                <span className="ml-2 text-blue-500 text-xs">(edited)</span>
              )}
            </label>
            <div className="relative">
              <select
                className={`w-full p-2 border rounded-md appearance-none pr-10 ${
                  editedFields.destination ? "border-blue-500" : ""
                }`}
                value={formData.destination}
                onChange={handleDestinationChange}
                disabled={isCompleted || legsLength === 0}
              >
                <option value="">Select destination</option>
                {destinations.map((destination) => (
                  <option key={destination} value={destination}>
                    {destination}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        <div
          style={{
            marginTop: "10px",
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          {drivers.length <= 5 && (
            <button
              ref={addDriverButtonRef}
              onClick={addDriver}
              className={`px-8 py-2 rounded-md transition-colors ${
                currentLagIndex !== null && !isCompleted
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }`}
              disabled={currentLagIndex === null || isCompleted}
            >
              Add Driver
            </button>
          )}

          {drivers.length === 0 && !isCompleted && (
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors"
              onClick={handleSave}
              disabled={
                saving ||
                isCompleted ||
                !formData.startingPoint ||
                !formData.destination
              }
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
