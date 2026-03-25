import { SPEED_OPTIONS, LAYER_OPTIONS } from "../constants"

export default function MapController({ layers, setIsPlaying, isPlaying, speed, setSpeed, activeLayer, setActiveLayer, hourLabel}) {
    return (
        <div className="map-controls">
            <button
                type="button"
                className="map-controls-button"
                onClick={() => setIsPlaying((playing) => !playing)}
            >
                {isPlaying ? 'Pause' : 'Play'}
            </button>
            <label className="map-controls-label" htmlFor="map-speed-select">
                Speed
            </label>
            <select
                id="map-speed-select"
                className="map-controls-select"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value) || 1)}
            >
                {SPEED_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <label className="map-controls-label" htmlFor="map-layer-select">
                Layer
            </label>
            {/* TODO: move to a separate component since not all maps will have the animation controller*/}
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
            <p className="map-controls-hour">Hour: {hourLabel}</p>
            <p className="map-controls-hint">Shift + drag to rotate</p>
        </div>
    )
}