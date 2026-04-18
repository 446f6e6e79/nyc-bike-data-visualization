/**
 * Component for the reset button that allows users to reset the map view to its default state.
 * The button is styled with an icon and text, and it triggers the provided onReset function when clicked. The onReset function is expected to handle the logic for resetting the map view, such as clearing selected stations or resetting the active layer.
 * @param {Function} onReset - The function to call when the reset button is clicked, which should handle the logic for resetting the map view. This can include actions like clearing selected stations or resetting the active layer to its default state.
 * @param {Function} onClick - An optional alternative prop for the click handler, provided for flexibility. If onReset is not provided, onClick will be used as the click handler for the button.
 * @returns 
 */
export default function ResetButton({ onReset, onClick, disabled = false }) {
    const handleClick = onReset ?? onClick

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className="map-reset-button"
            aria-label="Reset map view"
            title={disabled ? "Select a path to enable reset" : "Reset map view"}
        >
            <span className="map-reset-button-icon" aria-hidden="true">
                <i className="fa-solid fa-rotate-left" />
            </span>
            <span className="map-reset-button-text">Reset View</span>
        </button>
    )
}   