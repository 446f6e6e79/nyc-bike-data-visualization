
export const FILTERS = {
  user_type: { label: 'User Type', options: ['member', 'casual'] },
  bike_type: { label: 'Bike Type', options: ['classic_bike', 'electric_bike'] },
};

const formatLabel = (value) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function UserFilter({ currentUserFilters = {}, onUserFilterChange }) {
  return (
    <div className="user-filter">
      {Object.entries(FILTERS).map(([key, { label, options }]) => (
        <div className="user-filter-group" key={key}>
          <label className="user-filter-label" htmlFor={`filter-${key}`}>
            {label}
          </label>
          <div className="user-filter-select-wrapper">
            <select
              id={`filter-${key}`}
              className="user-filter-select"
              value={currentUserFilters[key] ?? ''}
              onChange={(e) => onUserFilterChange({ ...currentUserFilters, [key]: e.target.value || undefined })}
            >
              <option value="">All</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {formatLabel(opt)}
                </option>
              ))}
            </select>
            <span className="user-filter-chevron" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}