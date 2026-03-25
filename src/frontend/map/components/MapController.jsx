import { LAYER_OPTIONS } from "../constants"
import SpeedController from "./SpeedController"

export default function MapController({ activeLayer, setActiveLayer, currentHour={}, setCurrentHour={}, activeFrameCount={}, hasAnimation }) {
    // If animation is enabled but currentHour is not set, show an error message
    const hourLabel = `${String(currentHour).padStart(2, '0')}:00`

    return (
        <div className="map-controls">
            {hasAnimation && (
                <div>
                    <SpeedController
                        setCurrentHour={setCurrentHour}
                        activeFrameCount={activeFrameCount}
                    />
                    <p className="map-controls-hour">Hour: {hourLabel}</p>
                </div>
            )}
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
        </div>
    )
}