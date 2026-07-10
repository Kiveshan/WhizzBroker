"use client"

const SearchFilter = ({
  searchValue,
  onSearchChange,
  statusValue,
  onStatusChange,
  onApplyFilters,
  showStatusFilter = true,
  placeholder = "Search...",
  loading = false,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault()
    onApplyFilters()
  }

  return (
    <form onSubmit={handleSubmit} className="search-filter-container">
      <div className="search-input-group">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="search-input"
        />
        <button type="submit" className="search-btn" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {showStatusFilter && (
        <div className="status-filter-group">
          <label>Status:</label>
          <select value={statusValue} onChange={(e) => onStatusChange(e.target.value)} className="status-select">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          onSearchChange("")
          if (showStatusFilter) onStatusChange("all")
          onApplyFilters()
        }}
        className="clear-filters-btn"
        disabled={loading}
      >
        Clear
      </button>
    </form>
  )
}

export default SearchFilter
