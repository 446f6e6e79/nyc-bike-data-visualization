import { useSpeedHandler } from '../hooks/useSpeedHandler.js'

export const HOURS_IN_DAY = 24
export const BASE_FRAME_MS = 1000     // Duration of an hour in milliseconds at normal speed (1x)
export const SPEED_OPTIONS = [        // Options for animation speed control
        { label: '0.5×', value: 0.5 },
        { label: '1×', value: 1 },
        { label: '2×', value: 2 },
]


/**
 * Component for controlling the animation speed and play/pause state of the map visualization.
 * @param {Function} setCurrentTime - Function to update the current time in the parent component. 
 * @param {number} currentTime - The current time in hours (can be a fractional value representing minutes).
 * @returns 
 */
export default function SpeedController({ setCurrentTime, currentTime}) {
    const {
        currentTimeLabel,
        isPlaying,
        setIsPlaying,
        setSpeed,
        speed,
    } = useSpeedHandler({
        setCurrentTime,
        currentTime,
        hoursInDay: HOURS_IN_DAY,
        baseFrameMs: BASE_FRAME_MS,
    })

    // Render the play/pause button, speed selector, and current time display
    return (
        <div>
            {/* Button to toggle play/pause state of the animation */}
            <button
                type="button"
                className="map-controls-button"
                onClick={() => setIsPlaying((playing) => !playing)}
            >
                {isPlaying ? 'Pause' : 'Play'}
            </button>
            {/* Dropdown to select the speed of the animation */}
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
            {/* Display the current time in HH:MM format */}
            <p className="map-controls-hour">Time: {currentTimeLabel}</p>
        </div>
    )
}