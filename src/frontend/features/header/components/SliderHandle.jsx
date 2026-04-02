/**Slider Utilities */
import { useCallback } from 'react'

// Handle component represents the draggable handles for resizing the date range selection, supporting keyboard interactions for accessibility by allowing users to step through months using arrow keys.
export default function SliderHandle({ side, value, min, max, label, onStep }) {
    // Handle left and right arrow keys to step through months, ensuring the value stays within the provided min and max bounds.
    const handleKeyDown = useCallback((event) => {
        const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
        if (!step) return

        event.preventDefault()
        onStep(value + step)
    }, [onStep, value])

    // Render a button element for the handle, with appropriate ARIA attributes for accessibility, and styling classes based on the side (start or end) of the handle.
    return (
        <button
            type="button"
            role="slider"
            aria-label={side === 'start' ? 'Start month handle' : 'End month handle'}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-valuetext={label}
            onKeyDown={handleKeyDown}
            className={`date-range-filter__handle date-range-filter__handle--${side}`}
        >
            <div className="date-range-filter__handle-line" />
        </button>
    )
}

