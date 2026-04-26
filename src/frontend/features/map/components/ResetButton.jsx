import { useEffect, useRef, useState } from 'react'

/**
 * Component for the reset button that allows users to reset the map view to its default state.
 * The button is styled with an icon and text, and it triggers the provided onReset function when clicked. The onReset function is expected to handle the logic for resetting the map view, such as clearing selected stations or resetting the active layer.
 * @param {Function} onReset - The function to call when the reset button is clicked, which should handle the logic for resetting the map view. This can include actions like clearing selected stations or resetting the active layer to its default state.
 * @param {Function} onClick - An optional alternative prop for the click handler, provided for flexibility. If onReset is not provided, onClick will be used as the click handler for the button.
 * @returns 
 */
export default function ResetButton({ onReset, onClick, disabled = false }) {
    const handleClick = onReset ?? onClick
    const tooltipRef = useRef(null)
    const tooltipAnimationFrameRef = useRef(null)
    const [showDisabledTooltip, setShowDisabledTooltip] = useState(false)
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

    const positionDisabledTooltip = (clientX, clientY) => {
        const tooltipNode = tooltipRef.current
        if (!tooltipNode) return

        const nextX = clientX
        const nextY = clientY + 14

        if (tooltipAnimationFrameRef.current) {
            cancelAnimationFrame(tooltipAnimationFrameRef.current)
        }

        tooltipAnimationFrameRef.current = requestAnimationFrame(() => {
            tooltipNode.style.left = `${nextX}px`
            tooltipNode.style.top = `${nextY}px`
            tooltipAnimationFrameRef.current = null
        })
    }

    const handleDisabledMouseEnter = (event) => {
        if (!disabled) {
            setShowDisabledTooltip(false)
            return
        }

        setTooltipPosition({
            x: event.clientX,
            y: event.clientY + 14
        })
        setShowDisabledTooltip(true)
    }

    const handleDisabledMouseMove = (event) => {
        if (!disabled) {
            setShowDisabledTooltip(false)
            return
        }

        positionDisabledTooltip(event.clientX, event.clientY + 14)
    }

    const handleDisabledMouseLeave = () => {
        if (tooltipAnimationFrameRef.current) {
            cancelAnimationFrame(tooltipAnimationFrameRef.current)
            tooltipAnimationFrameRef.current = null
        }
        setShowDisabledTooltip(false)
    }

    useEffect(() => {
        return () => {
            if (tooltipAnimationFrameRef.current) {
                cancelAnimationFrame(tooltipAnimationFrameRef.current)
                tooltipAnimationFrameRef.current = null
            }
        }
    }, [])

    return (
        <div
            className="map-reset-button-wrap"
            onMouseEnter={handleDisabledMouseEnter}
            onMouseMove={handleDisabledMouseMove}
            onMouseLeave={handleDisabledMouseLeave}
        >
            <button
                type="button"
                onClick={handleClick}
                disabled={disabled}
                className="map-reset-button"
                aria-label="Reset map view"
                title={disabled ? undefined : 'Reset map view'}
            >
                <span className="map-reset-button-icon" aria-hidden="true">
                    <i className="fa-solid fa-rotate-left" />
                </span>
                <span className="map-reset-button-text">Reset View</span>
            </button>

            <div
                ref={tooltipRef}
                className={`map-reset-tooltip${showDisabledTooltip ? ' is-visible' : ''}`}
                style={{
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y}px`,
                }}
                aria-hidden={!showDisabledTooltip}
            >
                Select at least one station
            </div>
        </div>
    )
}   