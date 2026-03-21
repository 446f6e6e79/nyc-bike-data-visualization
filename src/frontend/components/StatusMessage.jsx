function StatusMessage({ loading, error }) {
  if (loading) {
    return (
      <div className="status-wrap">
        <div className="status-spinner" />
        <span className="status-text">Fetching bike data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="status-wrap status-wrap--error">
        <svg className="status-icon" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 4.5v4M8 10.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="status-text">Could not load data — please try again.</span>
      </div>
    )
  }

  return null
}

export default StatusMessage