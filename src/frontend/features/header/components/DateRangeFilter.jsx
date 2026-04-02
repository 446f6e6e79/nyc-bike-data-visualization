import useDateRangeBounds from '../hooks/useDateBounds.js'
import useDateRangeCommit from '../hooks/useDateRangeCommit.js'
import useDateRangePresentation from '../hooks/useDatePresentation.js'
import useSliderHandler from '../hooks/useSliderHandler.js'
import SliderHandle from './SliderHandle.jsx'
import { MONTH_LABELS } from '../../../config.jsx'

/**
 * DateRangeFilter component provides an interactive slider for selecting a date range based on the dataset's coverage.
 * @param {Object} props
 * @param {Object} props.value - The currently applied date range filter value, containing start_date and end_date.
 * @param {Function} props.onCommit - Callback function to commit the selected date range, receiving the payload with start_date and end_date in 'YYYY-MM-DD' format.
 * @returns JSX element representing the date range filter UI, including the slider, markers, year labels, and apply button.
 */
export default function DateRangeFilter({ value, onCommit }) {
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
    const { selection: selectionView,
        resizeStart,
        resizeEnd,
        beginPointerAction
    } = useSliderHandler({totalMonths, maxWindowSize, minDate, defaultRange})
    // Presentation hook to derive UI-facing labels
    const {
        dateLabel,
        markers,
        yearLabels,
        isLoadingView,
        isUnavailableView,
    } = useDateRangePresentation({selection: selectionView, minDate, totalMonths, loading, error, bounds})
    // Commit hook to manage the commit payload derivation, auto-commit behavior, and apply action state for the currently selected date range on the slider
    const {
        isCommitting,
        hasPendingChanges,
        handleApply,
    } = useDateRangeCommit({selection: selectionView, value, onCommit, defaultRange})

    if (isLoadingView) {
        return (
            <div className="date-range-filter">
                <div className="date-range-filter__header">
                    <span className="date-range-filter__eyebrow">
                        Date Window
                    </span>
                    <span className="date-range-filter__value">
                        Loading date range...
                    </span>
                </div>
            </div>
        )
    }

    if (isUnavailableView) {
        return (
            <div className="date-range-filter">
                <div className="date-range-filter__header">
                    <span className="date-range-filter__eyebrow">
                        Date Window
                    </span>
                    <span className="date-range-filter__value">
                        Date range unavailable
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className="date-range-filter">
            {/* Header */}
            <div className="date-range-filter__header">
                <span className="date-range-filter__eyebrow">
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
                                className={`date-range-filter__tick${marker.isSelected ? ' date-range-filter__tick--selected' : ''}${marker.isYearStart ? ' date-range-filter__tick--year-start' : ''}`}
                            />

                            {marker.label && (
                                <span
                                    className={`date-range-filter__month-label${marker.isSelected ? ' date-range-filter__month-label--selected' : ''}`}
                                >
                                    {marker.label}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Selection window */}
                <div
                    onPointerDown={(event) => beginPointerAction(event, 'move')}
                    className="date-range-filter__selection"
                >
                    {/* Start handle */}
                    <div
                        onPointerDown={(event) => beginPointerAction(event, 'resize-start')}
                        className="date-range-filter__handle-anchor date-range-filter__handle-anchor--start"
                    >
                        <SliderHandle
                            side="start"
                            value={selectionView.startIndex}
                            min={0}
                            max={selectionView.endIndex}
                            label={MONTH_LABELS[selectionView.startDate.getMonth()]}
                            onStep={resizeStart}
                        />
                    </div>

                    {/* End handle */}
                    <div
                        onPointerDown={(event) => beginPointerAction(event, 'resize-end')}
                        className="date-range-filter__handle-anchor date-range-filter__handle-anchor--end"
                    >
                        <SliderHandle
                            side="end"
                            value={selectionView.endIndex}
                            min={selectionView.startIndex}
                            max={totalMonths - 1}
                            label={MONTH_LABELS[selectionView.endDate.getMonth()]}
                            onStep={resizeEnd}
                        />
                    </div>
                </div>
            </div>
            <div className="date-range-filter__actions">
                <button
                    type="button"
                    onClick={handleApply}
                    disabled={!hasPendingChanges || isCommitting || !onCommit}
                    className={`date-range-filter__button${isCommitting ? ' date-range-filter__button--committing' : ''}`}
                >
                    {isCommitting ? 'Loading...' : 'Apply'}
                </button>
            </div>
        </div>
    )
}
