import { LAYER_OPTIONS } from "../constants"
import SpeedController from "./SpeedController"

export default function MapController({ activeLayer, setActiveLayer, currentTime = 0, setCurrentTime, hasAnimation }) {
    const hours = Math.floor(currentTime)
    const minutes = Math.floor((currentTime % 1) * 60)
    const timeLabel = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

    return (
        <div className="map-controls">
            {hasAnimation && (
                <div>
                    <SpeedController
                        setCurrentTime={setCurrentTime}
                    />
                    <p className="map-controls-hour">Time: {timeLabel}</p>
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