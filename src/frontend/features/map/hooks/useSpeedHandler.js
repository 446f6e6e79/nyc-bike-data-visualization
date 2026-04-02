import { useEffect, useState } from 'react'

/**
 * Hook for controlling the animation speed and play/pause state of the map visualization.
 * @param {Function} setCurrentTime - Function to update the current time in the parent component.
 * @param {number} currentTime - The current time in hours (can be a fractional value representing minutes).
 * @param {number} hoursInDay - Number of hours in one full animation cycle.
 * @param {number} baseFrameMs - Duration of an hour in milliseconds at normal speed (1x).
 * @returns {Object} Speed handler state and setters for the controller UI.
 */
export function useSpeedHandler({ setCurrentTime, currentTime, hoursInDay, baseFrameMs }) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [speed, setSpeed] = useState(1)
    const currentTimeLabel =
        `${String(Math.floor(currentTime)).padStart(2, '0')}:` +
        `${String(Math.floor((currentTime % 1) * 60)).padStart(2, '0')}`

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
            const hoursProgressed = elapsedMs * speed / baseFrameMs
            // Update the current time by adding the progressed hours, and wrap around using modulo to stay within a 24-hour cycle
            setCurrentTime((time) => (time + hoursProgressed) % hoursInDay)
            animationFrameId = window.requestAnimationFrame(advanceFrame)
        }

        animationFrameId = window.requestAnimationFrame(advanceFrame)
        return () => {
            if (animationFrameId != null) {
                window.cancelAnimationFrame(animationFrameId)
            }
        }
    }, [isPlaying, speed, setCurrentTime, hoursInDay, baseFrameMs])

    return {
        currentTimeLabel,
        isPlaying,
        setIsPlaying,
        setSpeed,
        speed,
    }
}