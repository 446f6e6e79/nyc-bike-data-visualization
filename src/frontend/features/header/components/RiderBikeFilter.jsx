export const FILTERS = {
  user_type: { label: 'User Type', options: ['member', 'casual'] },
  bike_type: { label: 'Bike Type', options: ['classic_bike', 'electric_bike'] },
};

const formatLabel = (value) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Component for filtering rides based on rider type and bike type, allowing users to select from predefined options for each filter category, with an "All" option to reset filters.
 * @param {object} value - An object containing the current filter values, where keys correspond to filter categories (e.g., user_type, bike_type) and values are the selected options for those categories.
 * @param {function} onChange - A callback function that is called when the filter values change, receiving the updated filter values as an argument.
 * @returns
 */
export default function RiderBikeFilter({ value = {}, onChange }) {
  return (
    <div className="rider-filter">
      {Object.entries(FILTERS).map(([key, { label, options }]) => (
        <div className="rider-filter-group" key={key}>
          <span className="rider-filter-label">{label}</span>
          <div className="rider-filter-selector">
            <button
              className={`rider-filter-btn${!value[key] ? ' active' : ''}`}
              onClick={() => onChange({ ...value, [key]: undefined })}
            >
              All
            </button>
            {options.map((opt) => (
              <button
                key={opt}
                className={`rider-filter-btn${value[key] === opt ? ' active' : ''}`}
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
