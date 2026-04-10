/**
 * Component for toggling the visibility of bike routes on the map.
 * @param {boolean} showBikeRoutes - Whether bike routes are currently shown on the map.
 * @param {Function} setShowBikeRoutes - Function to update the showBikeRoutes state in the parent component.
 * @returns
 */
export default function BikeRoutesToggle({ showBikeRoutes, setShowBikeRoutes }) {
    return (
        <label className="map-controls-label map-controls-toggle">
            <input
                type="checkbox"
                checked={showBikeRoutes}
                onChange={(e) => setShowBikeRoutes(e.target.checked)}
            />
            Bike routes
        </label>
    )
}
