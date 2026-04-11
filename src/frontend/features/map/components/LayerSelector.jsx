import { LAYER_OPTIONS } from '../MapPage.jsx'

/**
 * Button-group selector for the active map layer.
 * @param {string} activeLayer - The currently active layer value.
 * @param {Function} setActiveLayer - Callback to update the active layer.
 */
export default function LayerSelector({ activeLayer, setActiveLayer }) {
    return (
        <div className="layer-selector">
            {LAYER_OPTIONS.map(({ value, label }) => (
                <button
                    key={value}
                    className={`layer-selector-btn${value === activeLayer ? ' active' : ''}`}
                    onClick={() => setActiveLayer(value)}
                >
                    {label}
                </button>
            ))}
        </div>
    )
}
