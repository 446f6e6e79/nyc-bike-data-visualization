import { LAYER_OPTIONS } from "../MapPage.jsx"
import SpeedController from "./SpeedController"
import BikeRoutesToggle from "./BikeRoutesToggle"
import ResetButton from "./ResetButton.jsx"

/**
 * Component for controlling the active map layer and animation settings. 
 * Provides a dropdown to select the active layer and, if the layer supports animation, includes the SpeedController for time-based animations.
 * @param {string} activeLayer - The currently active map layer.
 * @param {Function} setActiveLayer - Function to update the active layer in the parent component.
 * @param {number} currentTime - The current time in hours (can be a fractional value representing minutes) for animation purposes.
 * @param {Function} setCurrentTime - Function to update the current time in the parent component.
 * @param {boolean} hasAnimation - Indicates whether the currently active layer supports animation, which determines if the SpeedController should be displayed.
 * @param {boolean} showBikeRoutes - Whether bike routes are currently shown on the map, which is relevant for the infrastructure layer.
 * @param {Function} setShowBikeRoutes - Function to update the showBikeRoutes state in the parent component, allowing the user to toggle bike routes on the infrastructure layer.
 * @param {Function} resetSelectedStationIds - Function to reset the selected station IDs in the trip flow layer, allowing users to clear their selection and reset the view.
 * @returns 
 */
export default function MapController({
    activeLayer,
    setActiveLayer,
    currentTime,
    setCurrentTime,
    hasAnimation,
    showBikeRoutes,
    setShowBikeRoutes,
    resetSelectedStationIds,
}) {
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

            {/* Reset button for the trip flow layer to clear station selection and reset the view.*/}
            {activeLayer === 'trip_flow' && (
                <ResetButton
                    onClick={() => {
                        resetSelectedStationIds()
                    }}
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