import { useEffect, useRef } from 'react'
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
                        onPointerDown={disabled ? undefined : (event) => beginPointerAction(event, 'resize-start')}
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
                        onPointerDown={disabled ? undefined : (event) => beginPointerAction(event, 'resize-end')}
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
            </div>
        </div>
    )
}
