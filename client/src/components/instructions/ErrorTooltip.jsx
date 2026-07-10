export function ErrorTooltip({ message, disabled = false }) {
  if (disabled || !message) return null;
  return (
    <div className="controller-instructions-error-tooltip">
      {message}
      <div className="controller-instructions-tooltip-arrow" />
    </div>
  );
}
