import { useState, useRef, useEffect } from "react"

// Styled autocomplete input for route Starting Point / Destination fields.
// Drops the native <datalist> (browser-styled, uncontrollable) in favour of a
// custom list that matches the manage form's existing look and feel.
const RouteAutocompleteInput = ({ value, onChange, options = [], required, id }) => {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  // Filtered down to matches, capped so the list doesn't grow enormous.
  const query = (value || "").toLowerCase().trim()
  const filtered = query
    ? options.filter((opt) => opt.toLowerCase().includes(query)).slice(0, 20)
    : options.slice(0, 20)

  useEffect(() => {
    const close = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const select = (opt) => {
    onChange(opt)
    setOpen(false)
  }

  return (
    <div className="route-autocomplete" ref={wrapperRef}>
      <input
        id={id}
        type="text"
        className="form-input"
        value={value || ""}
        autoComplete="off"
        required={required}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <ul className="route-autocomplete-list" role="listbox">
          {filtered.map((opt) => (
            <li
              key={opt}
              role="option"
              aria-selected={false}
              className="route-autocomplete-item"
              // mousedown fires before blur so we prevent default to keep focus,
              // then fire the selection synchronously.
              onMouseDown={(e) => {
                e.preventDefault()
                select(opt)
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default RouteAutocompleteInput
