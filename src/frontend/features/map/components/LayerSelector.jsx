import { LAYER_OPTIONS } from '../MapPage.jsx'

const LAYER_ICONS = {
    station_usage: 'fa-solid fa-chart-column',
    trip_flow: 'fa-solid fa-arrows-left-right',
    infrastructure: 'fa-solid fa-road',
}

const getLayerIcon = (value) => LAYER_ICONS[value] ?? 'fa-solid fa-circle'

/**
 * Button-group selector for the active map layer.
 * @param {string} activeLayer - The currently active layer value.
 * @param {Function} setActiveLayer - Callback to update the active layer.
 * @param {boolean} [disabled=false] - Whether layer buttons are disabled.
 */
export default function LayerSelector({ activeLayer, setActiveLayer, disabled = false }) {
    return (
        <div className="layer-selector" aria-disabled={disabled}>
            {LAYER_OPTIONS.map(({ value, label }) => (
                <button
                    key={value}
                    className={`layer-selector-btn${value === activeLayer ? ' active' : ''}`}
                    onClick={() => setActiveLayer(value)}
                    disabled={disabled}
                    aria-disabled={disabled}
                >
                    <span className="layer-selector-btn__icon" aria-hidden="true">
                        <i className={getLayerIcon(value)} />
                    </span>
                    {label}
                </button>
            ))}
        </div>
    )
}
