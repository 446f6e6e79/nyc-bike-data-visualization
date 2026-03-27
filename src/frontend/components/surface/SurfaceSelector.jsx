import { METRIC_LABELS } from '../../pages/SurfacePage.jsx'

/**
 * Component for selecting which metric to display on the surface graph.
 * @param {Object} activeMetric - The currently selected metric key, used to determine which metric is active and should be highlighted in the UI.
 * @param {Function} setActiveMetric - Function to update the active metric in the parent component when a new metric is selected by the user.
 * @returns 
 */
function SurfaceSelector({activeMetric, setActiveMetric}) {
    return (
        <div className="surface-metric-selector">
            {Object.entries(METRIC_LABELS).map(([key, label]) => (
                <button
                    key={key}
                    onClick={() => setActiveMetric(key)}
                    className={`surface-metric-btn${key === activeMetric ? ' active' : ''}`}
                >
                    {label}
                </button>
            ))}
        </div>
    )
}

export default SurfaceSelector