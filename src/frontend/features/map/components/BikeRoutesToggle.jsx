/**
 * Component for toggling the visibility of bike routes on the map.
 * @param {boolean} showBikeRoutes - Whether bike routes are currently shown on the map.
 * @param {Function} setShowBikeRoutes - Function to update the showBikeRoutes state in the parent component.
 * @returns
 */
export default function BikeRoutesToggle({ showBikeRoutes, setShowBikeRoutes }) {
    return (
        <button
            type="button"
            className={`map-toggle-button${showBikeRoutes ? ' is-active' : ''}`}
            aria-pressed={showBikeRoutes}
            aria-label={`Bike routes ${showBikeRoutes ? 'visible' : 'inactive'}. Click to toggle.`}
            onClick={() => setShowBikeRoutes(!showBikeRoutes)}
        >
            <span className="map-toggle-button__icon" aria-hidden="true">
                <i className="fa-solid fa-map" />
            </span>
            <span className="map-toggle-button__label">Bike Routes</span>
        </button>
    )
}
