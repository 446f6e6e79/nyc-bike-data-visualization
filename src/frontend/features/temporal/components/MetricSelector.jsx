import { METRICS } from "../utils/metric_formatter.jsx"

/**
 * Component for selecting which metric to display on the surface graph.
 * @param {Object} activeMetric - The currently selected metric key, used to determine which metric is active and should be highlighted in the UI.
 * @param {Function} setActiveMetric - Function to update the active metric in the parent component when a new metric is selected by the user.
 * @param {boolean} [disabled=false] - Whether selector interactions are disabled.
 * @returns 
 */
function MetricSelector({activeMetric, setActiveMetric, disabled = false}) {
    return (
        <div className="surface-metric-selector">
            {Object.entries(METRICS).map(([key, config]) => (
                <button
                    key={key}
                    onClick={() => setActiveMetric(key)}
                    className={`surface-metric-btn${key === activeMetric ? ' active' : ''}`}
                    disabled={disabled}
                    aria-disabled={disabled}
                >
                    {config.label}
                </button>
            ))}
        </div>
    )
}

export default MetricSelector