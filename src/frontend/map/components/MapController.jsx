import { LAYER_OPTIONS } from "../../pages/MapPage.jsx"
import SpeedController from "./SpeedController"
import BikeRoutesToggle from "./BikeRoutesToggle"

/**
 * Component for controlling the active map layer and animation settings. 
 * Provides a dropdown to select the active layer and, if the layer supports animation, includes the SpeedController for time-based animations.
 * @param {string} activeLayer - The currently active map layer.
 * @param {Function} setActiveLayer - Function to update the active layer in the parent component.
 * @param {number} currentTime - The current time in hours (can be a fractional value representing minutes) for animation purposes.
 * @param {Function} setCurrentTime - Function to update the current time in the parent component.
 * @param {boolean} hasAnimation - Indicates whether the currently active layer supports animation, which determines if the SpeedController should be displayed.
 * @returns 
 */
export default function MapController({ activeLayer, setActiveLayer, currentTime, setCurrentTime, hasAnimation, showBikeRoutes, setShowBikeRoutes }) {
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

            {/* Bike routes toggle — only relevant on the availability layer */}
            {activeLayer === 'infrastructure' && (
                <BikeRoutesToggle
                    showBikeRoutes={showBikeRoutes}
                    setShowBikeRoutes={setShowBikeRoutes}
                />
            )}

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