import { SPEED_OPTIONS } from "../constants"
import { useState, useEffect } from "react"
import { HOURS_IN_DAY, BASE_FRAME_MS } from "../constants"

export default function SpeedController(
    { setCurrentTime } // function to update the current time in the parent component
){
    const [isPlaying, setIsPlaying] = useState(false)
    const [speed, setSpeed] = useState(1)

    // Updates the current time based on the selected speed
    useEffect(() => {
        if (!isPlaying) {
            return undefined
        }
        let animationFrameId = null
        let previousTimestamp = null

        const advanceFrame = (timestamp) => {
            if (previousTimestamp == null) {
                previousTimestamp = timestamp
            }
            const elapsedMs = timestamp - previousTimestamp
            previousTimestamp = timestamp
            // The progress is calculated as the elapsed time divided by the base frame time, multiplied by the speed factor
            const hoursProgressed = elapsedMs * speed / (BASE_FRAME_MS)
            // Update the current time by adding the progressed hours, and wrap around using modulo to stay within a 24-hour cycle
            setCurrentTime((time) => (time + hoursProgressed) % HOURS_IN_DAY)
            animationFrameId = window.requestAnimationFrame(advanceFrame)
        }

        animationFrameId = window.requestAnimationFrame(advanceFrame)
        return () => {
            if (animationFrameId != null) {
                window.cancelAnimationFrame(animationFrameId)
            }
        }
    }, [isPlaying, speed])

    return (
        <div>
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
        </div>
    )
}