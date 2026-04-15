export const FILTERS = {
  user_type: { label: 'User Type', options: ['member', 'casual'] },
  bike_type: { label: 'Bike Type', options: ['classic_bike', 'electric_bike'] },
};

const FILTER_HINTS = {
  user_type: 'Categories: Member (subscribed riders) and Casual (single-ride or pass users). Use All to include both groups.',
  bike_type: 'Categories: Classic Bike and Electric Bike. Use All to compare the combined behavior of both bike types.',
};

const formatLabel = (value) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Component for filtering rides based on rider type and bike type, allowing users to select from predefined options for each filter category, with an "All" option to reset filters.
 * @param {object} value - An object containing the current filter values, where keys correspond to filter categories (e.g., user_type, bike_type) and values are the selected options for those categories.
 * @param {function} onChange - A callback function that is called when the filter values change, receiving the updated filter values as an argument.
 * @returns
 */
export default function RiderBikeFilter({ value = {}, onChange, disabled = false }) {
  return (
    <div className={`rider-filter${disabled ? ' rider-filter--disabled' : ''}`} aria-disabled={disabled}>
      {Object.entries(FILTERS).map(([key, { label, options }]) => (
        <div className="rider-filter-group" key={key}>
          <div className="rider-filter-label-wrap">
            <span className="rider-filter-label">{label}</span>
            <span
              className="rider-filter-help"
              tabIndex={0}
              role="note"
              aria-label={`${label} filter info`}
            >
              ?
              <span className="rider-filter-tooltip" role="tooltip">
                {FILTER_HINTS[key]}
              </span>
            </span>
          </div>
          <div className="rider-filter-selector">
            <button
              className={`rider-filter-btn${!value[key] ? ' active' : ''}`}
              disabled={disabled}
              onClick={() => onChange({ ...value, [key]: undefined })}
            >
              All
            </button>
            {options.map((opt) => (
              <button
                key={opt}
                className={`rider-filter-btn${value[key] === opt ? ' active' : ''}`}
                disabled={disabled}
                onClick={() => onChange({ ...value, [key]: opt })}
              >
                {formatLabel(opt)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
