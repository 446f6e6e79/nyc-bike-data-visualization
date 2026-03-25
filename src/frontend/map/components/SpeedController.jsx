import { SPEED_OPTIONS } from "../constants"
import { useState, useEffect } from "react"
import { HOURS_IN_DAY, BASE_FRAME_MS } from "../constants"

export default function SpeedController({ setCurrentHour, activeFrameCount }) {
    const [isPlaying, setIsPlaying] = useState(false)  // Whether the animation is currently playing
    const [speed, setSpeed] = useState(1)              // Animation speed multiplier (1x by default)

    useEffect(() => {
        if (!isPlaying || activeFrameCount === 0) {
            return undefined
        }

        const intervalId = window.setInterval(() => {
            setCurrentHour((hour) => (hour + 1) % HOURS_IN_DAY)
        }, BASE_FRAME_MS / speed)

        return () => window.clearInterval(intervalId)
    }, [isPlaying, activeFrameCount, speed])

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