import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSpeedHandler } from '../hooks/useSpeedHandler.js'

export const HOURS_IN_DAY = 24
const BASE_FRAME_MS = 1000
const MINUTES_IN_HOUR = 60
const MINUTES_IN_DAY = HOURS_IN_DAY * MINUTES_IN_HOUR
const MAX_MINUTE_INDEX = MINUTES_IN_DAY - 1
const TIME_DRAG_THRESHOLD_PX = 4
const SPEED_DRAG_THRESHOLD_PX = 4
const MIN_SPEED = 0.5
const MAX_SPEED = 4
const SPEED_PIVOT = 2

function PlayIcon() {
    return (
        <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
            <path d="M1 1.5L9 6L1 10.5V1.5Z" />
        </svg>
    )
}

function PauseIcon() {
    return (
        <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
            <rect x="1" y="1" width="3" height="10" rx="0.5" />
            <rect x="6" y="1" width="3" height="10" rx="0.5" />
        </svg>
    )
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const speedToNonLinearPosition = (value) => {
    const clampedValue = clamp(value, MIN_SPEED, MAX_SPEED)

    if (clampedValue <= SPEED_PIVOT) {
        return ((clampedValue - MIN_SPEED) / (SPEED_PIVOT - MIN_SPEED)) * 50
    }

    const rightRatio = Math.log2(clampedValue / SPEED_PIVOT) / Math.log2(MAX_SPEED / SPEED_PIVOT)
    return 50 + rightRatio * 50
}

const nonLinearPositionToSpeed = (ratio) => {
    const clampedRatio = clamp(ratio, 0, 1)

    if (clampedRatio <= 0.5) {
        return MIN_SPEED + (clampedRatio / 0.5) * (SPEED_PIVOT - MIN_SPEED)
    }

    const rightRatio = (clampedRatio - 0.5) / 0.5
    return SPEED_PIVOT * 2 ** (rightRatio * Math.log2(MAX_SPEED / SPEED_PIVOT))
}

const normalizeTime = (time) => ((time % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY

const formatTimeLabel = (time) => {
    const normalizedTime = normalizeTime(time)
    const totalMinutes = Math.floor(normalizedTime * MINUTES_IN_HOUR)
    const hours = Math.floor(totalMinutes / MINUTES_IN_HOUR)
    const minutes = totalMinutes % MINUTES_IN_HOUR

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const formatSpeedLabel = (value) => {
    const rounded = Math.round(value * 10) / 10
    return Number.isInteger(rounded) ? `${rounded}×` : `${rounded.toFixed(1)}×`
}

const createHourMarks = () => Array.from({ length: HOURS_IN_DAY + 1 }, (_, hour) => {
    return {
        hour,
        label: String(hour).padStart(2, '0'),
        position: hour === HOURS_IN_DAY ? 100 : ((hour * MINUTES_IN_HOUR) / MAX_MINUTE_INDEX) * 100,
    }
})

/**
 * Horizontal draggable time wheel used to scrub the map time frame.
 * @param {Function} setCurrentTime - Function to update the current time in the parent component.
 * @param {number} currentTime - The current time in hours (can be a fractional value representing minutes).
 * @returns
 */
export default function SpeedController({ setCurrentTime, currentTime }) {
    const trackRef = useRef(null)
    const speedTrackRef = useRef(null)
    const activePointerIdRef = useRef(null)
    const speedPointerIdRef = useRef(null)
    const dragStartXRef = useRef(0)
    const dragStartMinuteIndexRef = useRef(0)
    const dragTrackWidthRef = useRef(0)
    const speedDragStartXRef = useRef(0)
    const hasDraggedRef = useRef(false)
    const speedHasDraggedRef = useRef(false)
    const [isDragging, setIsDragging] = useState(false)
    const [isSpeedDragging, setIsSpeedDragging] = useState(false)
    const {
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
    const hourMarks = useMemo(() => createHourMarks(), [])
    const currentTimeLabel = useMemo(() => formatTimeLabel(currentTime), [currentTime])
    const currentMinuteIndex = useMemo(() => {
        const normalizedTime = normalizeTime(currentTime)
        return clamp(Math.floor(normalizedTime * MINUTES_IN_HOUR), 0, MAX_MINUTE_INDEX)
    }, [currentTime])

    const currentPosition = (currentMinuteIndex / MAX_MINUTE_INDEX) * 100
    const stripTransform = `translateX(calc(50% - ${currentPosition}%))`
    const currentSpeedLabel = useMemo(() => formatSpeedLabel(speed), [speed])
    const currentSpeedPosition = useMemo(() => {
        return speedToNonLinearPosition(speed)
    }, [speed])
    const speedMarks = useMemo(() => {
        const marks = [
            { value: MIN_SPEED, label: '0.5×' },
            { value: MAX_SPEED, label: '4×' },
        ]

        return marks.map((mark, index) => ({
            ...mark,
            position: (index / (marks.length - 1)) * 100,
        }))
    }, [])
    const speedGuides = useMemo(() => ([1, 2, 3].map((value) => ({
        value,
        position: speedToNonLinearPosition(value),
    }))), [])

    const updateCurrentTimeFromClientX = useCallback((clientX) => {
        const track = trackRef.current
        if (!track) {
            return
        }

        const { left, width } = track.getBoundingClientRect()
        if (width <= 0) {
            return
        }

        const ratio = clamp((clientX - left) / width, 0, 1)
        const minuteIndex = Math.round((1 - ratio) * MAX_MINUTE_INDEX)
        setCurrentTime(minuteIndex / MINUTES_IN_HOUR)
    }, [setCurrentTime])

    const stopDragging = useCallback((event) => {
        const track = trackRef.current
        if (track != null && activePointerIdRef.current != null && track.hasPointerCapture(activePointerIdRef.current)) {
            track.releasePointerCapture(activePointerIdRef.current)
        }
        activePointerIdRef.current = null
        dragStartXRef.current = 0
        dragStartMinuteIndexRef.current = 0
        dragTrackWidthRef.current = 0
        setIsDragging(false)
        hasDraggedRef.current = false
    }, [])

    const handlePointerDown = (event) => {
        if (event.button !== 0) {
            return
        }

        event.preventDefault()

        const track = trackRef.current
        if (track == null) {
            return
        }

        activePointerIdRef.current = event.pointerId
        track.setPointerCapture(event.pointerId)
        setIsDragging(true)
        dragStartXRef.current = event.clientX
        dragStartMinuteIndexRef.current = currentMinuteIndex
        dragTrackWidthRef.current = track.getBoundingClientRect().width
        hasDraggedRef.current = false
    }

    const handlePointerMove = (event) => {
        if (!isDragging || activePointerIdRef.current !== event.pointerId) {
            return
        }

        if (!hasDraggedRef.current) {
            const dragDelta = Math.abs(event.clientX - dragStartXRef.current)
            if (dragDelta < TIME_DRAG_THRESHOLD_PX) {
                return
            }
            hasDraggedRef.current = true
        }

        event.preventDefault()
        const trackWidth = dragTrackWidthRef.current
        if (trackWidth <= 0) {
            return
        }

        const deltaX = event.clientX - dragStartXRef.current
        const minuteDelta = (deltaX / trackWidth) * MAX_MINUTE_INDEX
        const nextMinuteIndex = clamp(dragStartMinuteIndexRef.current - minuteDelta, 0, MAX_MINUTE_INDEX)
        setCurrentTime(nextMinuteIndex / MINUTES_IN_HOUR)
    }

    const handlePointerUp = (event) => {
        if (activePointerIdRef.current !== event.pointerId) {
            return
        }
        stopDragging(event)
    }

    const handlePointerCancel = (event) => {
        if (activePointerIdRef.current !== event.pointerId) {
            return
        }
        stopDragging(event)
    }

    const updateSpeedFromClientX = useCallback((clientX) => {
        const track = speedTrackRef.current
        if (!track) {
            return
        }

        const { left, width } = track.getBoundingClientRect()
        if (width <= 0) {
            return
        }

        const ratio = clamp((clientX - left) / width, 0, 1)
        const nextSpeed = nonLinearPositionToSpeed(ratio)
        setSpeed(Math.round(nextSpeed * 10) / 10)
    }, [setSpeed])

    const stopSpeedDragging = useCallback((event) => {
        const track = speedTrackRef.current
        if (track != null && speedPointerIdRef.current != null && track.hasPointerCapture(speedPointerIdRef.current)) {
            track.releasePointerCapture(speedPointerIdRef.current)
        }
        speedPointerIdRef.current = null
        speedDragStartXRef.current = 0
        speedHasDraggedRef.current = false
        setIsSpeedDragging(false)
    }, [])

    const handleSpeedPointerDown = (event) => {
        if (event.button !== 0) {
            return
        }

        event.preventDefault()

        const track = speedTrackRef.current
        if (track == null) {
            return
        }

        speedPointerIdRef.current = event.pointerId
        track.setPointerCapture(event.pointerId)
        setIsSpeedDragging(true)
        speedDragStartXRef.current = event.clientX
        speedHasDraggedRef.current = false
        updateSpeedFromClientX(event.clientX)
    }

    const handleSpeedPointerMove = (event) => {
        if (!isSpeedDragging || speedPointerIdRef.current !== event.pointerId) {
            return
        }

        if (!speedHasDraggedRef.current) {
            const dragDelta = Math.abs(event.clientX - speedDragStartXRef.current)
            if (dragDelta < SPEED_DRAG_THRESHOLD_PX) {
                return
            }
            speedHasDraggedRef.current = true
        }

        event.preventDefault()
        updateSpeedFromClientX(event.clientX)
    }

    const handleSpeedPointerUp = (event) => {
        if (speedPointerIdRef.current !== event.pointerId) {
            return
        }
        stopSpeedDragging(event)
    }

    const handleSpeedPointerCancel = (event) => {
        if (speedPointerIdRef.current !== event.pointerId) {
            return
        }
        stopSpeedDragging(event)
    }

    const handleSpeedKeyDown = (event) => {
        const stepMap = {
            ArrowLeft: -0.1,
            ArrowDown: -0.1,
            ArrowRight: 0.1,
            ArrowUp: 0.1,
            PageDown: -0.5,
            PageUp: 0.5,
        }

        if (event.key === 'Home') {
            event.preventDefault()
            setSpeed(MIN_SPEED)
            return
        }

        if (event.key === 'End') {
            event.preventDefault()
            setSpeed(MAX_SPEED)
            return
        }

        if (!(event.key in stepMap)) {
            return
        }

        event.preventDefault()
        const nextSpeed = clamp(speed + stepMap[event.key], MIN_SPEED, MAX_SPEED)
        setSpeed(Math.round(nextSpeed * 10) / 10)
    }

    const handleKeyDown = (event) => {
        const stepMap = {
            ArrowLeft: 1,
            ArrowDown: 1,
            ArrowRight: -1,
            ArrowUp: -1,
            PageDown: 15,
            PageUp: -15,
        }

        if (event.key === 'Home') {
            event.preventDefault()
            setCurrentTime(0)
            return
        }

        if (event.key === 'End') {
            event.preventDefault()
            setCurrentTime(MAX_MINUTE_INDEX / MINUTES_IN_HOUR)
            return
        }

        if (!(event.key in stepMap)) {
            return
        }

        event.preventDefault()
        const nextMinuteIndex = clamp(currentMinuteIndex + stepMap[event.key], 0, MAX_MINUTE_INDEX)
        setCurrentTime(nextMinuteIndex / MINUTES_IN_HOUR)
    }

    return (
        <div className="map-speed-controls">
            <div className="map-speed-controls__header">
                <div className="map-speed-controls__meta">
                    <span className="map-speed-clock">{currentTimeLabel}</span>
                    <span className="map-speed-controls__eyebrow">Time wheel</span>
                </div>
                <p className="map-speed-controls__hint">Drag the wheel to scrub the day in minute increments.</p>
            </div>
            <div className="map-time-wheel-layout">
                <button
                    type="button"
                    className={`map-speed-controls__play-btn${isPlaying ? ' is-playing' : ''}`}
                    aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
                    aria-pressed={isPlaying}
                    onClick={() => setIsPlaying((prev) => !prev)}
                >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>

                <div
                    ref={trackRef}
                    className={`map-time-wheel${isDragging ? ' is-dragging' : ''}`}
                    role="slider"
                    tabIndex={0}
                    aria-label="Map time wheel"
                    aria-valuemin={0}
                    aria-valuemax={MAX_MINUTE_INDEX}
                    aria-valuenow={currentMinuteIndex}
                    aria-valuetext={currentTimeLabel}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onKeyDown={handleKeyDown}
                >
                    <div className="map-time-wheel__rail" aria-hidden="true">
                        <div
                            className="map-time-wheel__moving-strip"
                            style={{ transform: stripTransform }}
                        >
                            <div className="map-time-wheel__ticks">
                                {hourMarks.map((mark) => (
                                    <span
                                        key={mark.hour}
                                        className="map-time-wheel__tick"
                                        style={{ left: `${mark.position}%` }}
                                    >
                                        <span className="map-time-wheel__tick-line" />
                                        <span className="map-time-wheel__tick-label">
                                            {mark.hour === HOURS_IN_DAY ? (
                                                <>
                                                    00
                                                    <span className="map-time-wheel__tick-next-day">+1</span>
                                                </>
                                            ) : (
                                                mark.label
                                            )}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        </div>
                        <span className="map-time-wheel__pre-indicator-overlay" />
                        <span className="map-time-wheel__center-indicator" />
                    </div>
                </div>

                <div className="map-speed-controls__speed-selector" role="group" aria-label="Playback speed">
                    <div className="map-speed-controls__speed-summary">
                        <span className="map-speed-controls__speed-value">{currentSpeedLabel}</span>
                    </div>

                    <div
                        ref={speedTrackRef}
                        className={`map-speed-controls__speed-wheel${isSpeedDragging ? ' is-dragging' : ''}`}
                        role="slider"
                        tabIndex={0}
                        aria-label="Playback speed wheel"
                        aria-valuemin={MIN_SPEED}
                        aria-valuemax={MAX_SPEED}
                        aria-valuenow={speed}
                        aria-valuetext={currentSpeedLabel}
                        onPointerDown={handleSpeedPointerDown}
                        onPointerMove={handleSpeedPointerMove}
                        onPointerUp={handleSpeedPointerUp}
                        onPointerCancel={handleSpeedPointerCancel}
                        onKeyDown={handleSpeedKeyDown}
                    >
                        <div className="map-speed-controls__speed-wheel-rail" aria-hidden="true">
                            <div
                                className="map-speed-controls__speed-wheel-overlay"
                                style={{ width: `${currentSpeedPosition}%` }}
                            />
                            <div className="map-speed-controls__speed-wheel-guides">
                                {speedGuides.map((guide) => (
                                    <span
                                        key={guide.value}
                                        className="map-speed-controls__speed-wheel-guide"
                                        style={{ left: `${guide.position}%` }}
                                    />
                                ))}
                            </div>
                            <div className="map-speed-controls__speed-wheel-marks">
                                {speedMarks.map((mark) => (
                                    <span
                                        key={mark.value}
                                        className="map-speed-controls__speed-wheel-mark"
                                        style={{ left: `${mark.position}%` }}
                                    >
                                        <span className="map-speed-controls__speed-wheel-mark-label">{mark.label}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
