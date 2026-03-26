import { LAYER_OPTIONS } from "../constants"
import SpeedController from "./SpeedController"

export default function MapController({ activeLayer, setActiveLayer, currentTime = 0, setCurrentTime, hasAnimation }) {
    return (
        <div className="map-controls">
            {/* Dropdown to select the active map layer */}
            <select
                id="map-layer-select"
                className="map-controls-select"
                value={activeLayer}
                onChange={(event) => setActiveLayer(event.target.value)}
            >
                {LAYER_OPTIONS.map((style) => (
                    <option key={style.value} value={style.value}>
                        {style.label}
                    </option>
                ))}
            </select>
            <p className="map-controls-hint">Shift + drag to rotate</p>

            {/* Add speed controller iff current layer has animation enabled */}
            {hasAnimation && (
                <div>
                    <SpeedController
                    setCurrentTime={setCurrentTime}
                    currentTime={currentTime}
                    /> 
                </div>
            )}
        </div>
    )
}