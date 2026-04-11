import { useSpeedHandler } from '../hooks/useSpeedHandler.js'

export const HOURS_IN_DAY = 24
export const BASE_FRAME_MS = 1000     // Duration of an hour in milliseconds at normal speed (1x)
export const SPEED_OPTIONS = [        // Options for animation speed control
    { label: '0.5×', value: 0.5 },
    { label: '1×',   value: 1   },
    { label: '2×',   value: 2   },
]

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

function ClockIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="6" cy="6" r="5" />
            <path d="M6 3.5V6L7.5 7.5" />
        </svg>
    )
}

/**
 * Component for controlling the animation speed and play/pause state of the map visualization.
 * @param {Function} setCurrentTime - Function to update the current time in the parent component.
 * @param {number} currentTime - The current time in hours (can be a fractional value representing minutes).
 * @returns
 */
export default function SpeedController({ setCurrentTime, currentTime }) {
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

    return (
        <div className="map-speed-controls">
            {/* Play / Pause toggle */}
            <button
                type="button"
                className="map-speed-play-btn"
                aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
                onClick={() => setIsPlaying((p) => !p)}
            >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Current time display */}
            <span className="map-speed-clock">
                <ClockIcon />
                {currentTimeLabel}
            </span>

            <span className="map-speed-divider" aria-hidden="true" />

            {/* Speed button group */}
            <div className="map-speed-rate" role="group" aria-label="Playback speed">
                {SPEED_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        className={`map-speed-rate-btn${speed === opt.value ? ' active' : ''}`}
                        aria-pressed={speed === opt.value}
                        onClick={() => setSpeed(opt.value)}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
