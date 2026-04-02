/**
 * Component for toggling the visibility of bike routes on the map.
 * @param {boolean} showBikeRoutes - Whether bike routes are currently shown on the map.
 * @param {Function} setShowBikeRoutes - Function to update the showBikeRoutes state in the parent component. 
 * @returns 
 */
export default function BikeRoutesToggle({ showBikeRoutes, setShowBikeRoutes }) {
    return (
        <div>
            <label className="map-controls-label" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                    type="checkbox"
                    checked={showBikeRoutes}
                    onChange={(e) => setShowBikeRoutes(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                />
                Bike routes
            </label>
        </div>
    )
}              