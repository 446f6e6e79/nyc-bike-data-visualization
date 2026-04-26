import { useEffect, useRef, useState } from 'react'
import useDateRangeBounds from '../hooks/useDateBounds.js'
import useDateRangeCommit from '../hooks/useDateRangeCommit.js'
import useDateRangePresentation from '../hooks/useDatePresentation.js'
import useSliderHandler from '../hooks/useSliderHandler.js'
import SliderHandle from './SliderHandle.jsx'
import { MONTH_LABELS } from '../../../utils/config.jsx'
import { cx } from '../../../utils/styling'

/**
 * Placeholder card shown while the dataset date range is loading or when it
 * cannot be resolved. Keeps the header footprint stable across states.
 */
function PlaceholderState({ label }) {
    return (
        <div className="date-range-filter">
            <div className="date-range-filter__header">
                <span className="date-range-filter__eyebrow">
                    <i className="date-range-filter__eyebrow-icon fa-solid fa-calendar-days" aria-hidden="true" />
                    Date Window
                </span>
                <span className="date-range-filter__value">{label}</span>
            </div>
        </div>
    )
}

/**
 * DateRangeFilter component provides an interactive slider for selecting a date range based on the dataset's coverage.
 * @param {Object} props
 * @param {Object} props.value - The currently applied date range filter value, containing start_date and end_date.
 * @param {Function} props.onCommit - Callback function to commit the selected date range, receiving the payload with start_date and end_date in 'YYYY-MM-DD' format.
 * @param {boolean} props.disabled - Whether interactions should be disabled while data is fetching.
 * @returns JSX element representing the date range filter UI, including the slider, markers, and year labels.
 */
export default function DateRangeFilter({ value, onCommit, disabled = false }) {
    // Hooks to manage date range bounds, slider interaction, presentation logic, and commit handling
    const {
        bounds,
        minDate,
        totalMonths,
        maxWindowSize,
        defaultRange,
        loading,
        error,
    } = useDateRangeBounds()
    // Slider handler hook to manage the current selection state and interaction handlers for resizing and moving the date range selection on the slider
    const {
        selection: selectionView,
        resizeStart,
        resizeEnd,
        beginPointerAction,
        isInteracting,
    } = useSliderHandler({ totalMonths, maxWindowSize, minDate, defaultRange })
    // Commit hook to manage commit payload derivation and commit action state for the selected range
    const {
        isCommitting,
        handleApply,
    } = useDateRangeCommit({ selection: selectionView, value, onCommit, defaultRange })

    const wasInteractingRef = useRef(false)
    const maxedTooltipRef = useRef(null)
    const tooltipAnimationFrameRef = useRef(null)
    const [activeHandle, setActiveHandle] = useState(null)
    const [showMaxedTooltip, setShowMaxedTooltip] = useState(false)
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

    useEffect(() => {
        if (isInteracting) {
            wasInteractingRef.current = true
            return
        }

        const shouldCommitOnRelease = wasInteractingRef.current && !disabled && !isCommitting
        wasInteractingRef.current = false
        if (shouldCommitOnRelease) {
            handleApply()
        }
    }, [disabled, handleApply, isCommitting, isInteracting])
    // Presentation hook to derive UI-facing labels
    const {
        dateLabel,
        markers,
        yearLabels,
        isLoadingView,
        isUnavailableView,
    } = useDateRangePresentation({ selection: selectionView, minDate, totalMonths, loading, error, bounds })

    const positionMaxedTooltip = (clientX, clientY) => {
        const track = document.querySelector('[data-month-slider]')
        const tooltipNode = maxedTooltipRef.current
        if (!track || !tooltipNode) return

        const trackRect = track.getBoundingClientRect()
        const nextX = clientX - trackRect.left
        const nextY = clientY - trackRect.top - 12

        if (tooltipAnimationFrameRef.current) {
            cancelAnimationFrame(tooltipAnimationFrameRef.current)
        }

        tooltipAnimationFrameRef.current = requestAnimationFrame(() => {
            tooltipNode.style.left = `${nextX}px`
            tooltipNode.style.top = `${nextY}px`
            setShowMaxedTooltip(true)
            tooltipAnimationFrameRef.current = null
        })
    }

    const handleSliderMouseEnter = (event) => {
        if (!selectionView?.isMaxed) {
            setShowMaxedTooltip(false)
            return
        }

        const track = document.querySelector('[data-month-slider]')
        if (track) {
            const trackRect = track.getBoundingClientRect()
            setTooltipPosition({
                x: event.clientX - trackRect.left,
                y: event.clientY - trackRect.top,
            })
        }
        setShowMaxedTooltip(true)
    }

    const handleSliderMouseMove = (event) => {
        if (!selectionView?.isMaxed || activeHandle) {
            setShowMaxedTooltip(false)
            return
        }

        positionMaxedTooltip(event.clientX, event.clientY)
    }

    const handleSliderMouseLeave = () => {
        if (tooltipAnimationFrameRef.current) {
            cancelAnimationFrame(tooltipAnimationFrameRef.current)
            tooltipAnimationFrameRef.current = null
        }
        setShowMaxedTooltip(false)
    }

    const handleHandlePointerDown = (side) => (event) => {
        setActiveHandle(side)
        if (selectionView?.isMaxed) {
            positionMaxedTooltip(event.clientX, event.clientY)
        }
        beginPointerAction(event, side === 'start' ? 'resize-start' : 'resize-end')
    }

    useEffect(() => {
        if (!activeHandle || !selectionView?.isMaxed) return undefined

        const handleWindowPointerMove = (event) => {
            positionMaxedTooltip(event.clientX, event.clientY)
        }

        const handleWindowPointerUp = () => {
            setActiveHandle(null)
            setShowMaxedTooltip(false)
            if (tooltipAnimationFrameRef.current) {
                cancelAnimationFrame(tooltipAnimationFrameRef.current)
                tooltipAnimationFrameRef.current = null
            }
        }

        window.addEventListener('pointermove', handleWindowPointerMove)
        window.addEventListener('pointerup', handleWindowPointerUp)

        return () => {
            window.removeEventListener('pointermove', handleWindowPointerMove)
            window.removeEventListener('pointerup', handleWindowPointerUp)
        }
    }, [activeHandle, selectionView?.isMaxed])

    useEffect(() => {
        return () => {
            if (tooltipAnimationFrameRef.current) {
                cancelAnimationFrame(tooltipAnimationFrameRef.current)
                tooltipAnimationFrameRef.current = null
            }
        }
    }, [])

    if (isLoadingView) return <PlaceholderState label="Loading date range..." />
    if (isUnavailableView) return <PlaceholderState label="Date range unavailable" />

    return (
        <div className={`date-range-filter${disabled ? ' date-range-filter--disabled' : ''}`} aria-disabled={disabled}>
            {/* Header */}
            <div className="date-range-filter__header">
                <span className="date-range-filter__eyebrow">
                    <i className="date-range-filter__eyebrow-icon fa-solid fa-calendar-days" aria-hidden="true" />
                    Date Window
                </span>
                <span className="date-range-filter__value">
                    {dateLabel}
                </span>
            </div>

            {/* Slider track */}
            <div
                data-month-slider
                className="date-range-filter__track"
                style={{
                    '--date-range-filter-month-count': totalMonths,
                    '--date-range-filter-selection-start': selectionView.startIndex,
                    '--date-range-filter-selection-span': selectionView.monthCount,
                }}
            >
                {/* Year labels — float above the track */}
                {yearLabels.length > 1 && yearLabels.map(({ year, left }) => (
                    <div
                        key={year}
                        className="date-range-filter__year-label"
                        style={{ '--date-range-filter-year-left': `${left}%` }}
                    >
                        {year}
                    </div>
                ))}

                {/* Markers */}
                <div className="date-range-filter__markers">
                    {markers.map((marker) => (
                        <div
                            key={marker.key}
                            className="date-range-filter__marker"
                        >
                            {marker.isYearStart && (
                                <div className="date-range-filter__year-divider" />
                            )}

                            <div
                                className={cx(
                                    'date-range-filter__tick',
                                    marker.isSelected && 'date-range-filter__tick--selected',
                                    marker.isYearStart && 'date-range-filter__tick--year-start',
                                )}
                            />

                            {marker.label && (
                                <span
                                    className={cx(
                                        'date-range-filter__month-label',
                                        marker.isSelected && 'date-range-filter__month-label--selected',
                                    )}
                                >
                                    {marker.label}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Selection window */}
                <div
                    onPointerDown={disabled ? undefined : (event) => beginPointerAction(event, 'move')}
                    className="date-range-filter__selection"
                >
                    {/* Start handle */}
                    <div
                        onPointerDown={disabled ? undefined : handleHandlePointerDown('start')}
                        onMouseEnter={handleSliderMouseEnter}
                        onMouseMove={handleSliderMouseMove}
                        onMouseLeave={handleSliderMouseLeave}
                        className="date-range-filter__handle-anchor date-range-filter__handle-anchor--start"
                    >
                        <SliderHandle
                            side="start"
                            value={selectionView.startIndex}
                            min={0}
                            max={selectionView.endIndex}
                            label={MONTH_LABELS[selectionView.startDate.getMonth()]}
                            onStep={resizeStart}
                            disabled={disabled}
                        />
                    </div>

                    {/* End handle */}
                    <div
                        onPointerDown={disabled ? undefined : handleHandlePointerDown('end')}
                        onMouseEnter={handleSliderMouseEnter}
                        onMouseMove={handleSliderMouseMove}
                        onMouseLeave={handleSliderMouseLeave}
                        className="date-range-filter__handle-anchor date-range-filter__handle-anchor--end"
                    >
                        <SliderHandle
                            side="end"
                            value={selectionView.endIndex}
                            min={selectionView.startIndex}
                            max={totalMonths - 1}
                            label={MONTH_LABELS[selectionView.endDate.getMonth()]}
                            onStep={resizeEnd}
                            disabled={disabled}
                        />
                    </div>
                </div>

                {/* Maxed tooltip */}
                <div
                    ref={maxedTooltipRef}
                    className={`date-range-filter__tooltip date-range-filter__tooltip--maxed${showMaxedTooltip ? ' is-visible' : ''}`}
                    style={{
                        left: `${tooltipPosition.x}px`,
                        top: `${tooltipPosition.y}px`,
                    }}
                    aria-hidden={!showMaxedTooltip}
                >
                    <span className="date-range-filter__tooltip-text">
                        Maximum {maxWindowSize} months selected.
                    </span>
                </div>
            </div>
        </div>
    )
}
