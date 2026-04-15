import { LAYER_OPTIONS } from '../MapPage.jsx'

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
                    {label}
                </button>
            ))}
        </div>
    )
}
