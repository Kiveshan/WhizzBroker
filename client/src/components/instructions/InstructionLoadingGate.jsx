/**
 * InstructionLoadingGate — renders a loading spinner, a failure message with
 * retry button, or the form children once all data is ready.
 *
 * @param {object}         props
 * @param {boolean}        props.isLoadingComplete  True once all fetch flags cleared
 * @param {boolean}        props.hasDataFailure     True when required data arrays are empty
 * @param {string}         [props.failureMessage]
 * @param {function}       props.onRetry
 * @param {React.ReactNode} props.children
 */
export function InstructionLoadingGate({
  isLoadingComplete,
  hasDataFailure,
  failureMessage = "Failed to load required data. Please try again.",
  onRetry,
  children,
}) {
  if (!isLoadingComplete) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Loading data...</p>
      </div>
    );
  }

  if (hasDataFailure) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>{failureMessage}</p>
        <button
          onClick={onRetry}
          style={{
            padding: "8px 16px",
            backgroundColor: "#4a90e2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return children;
}
