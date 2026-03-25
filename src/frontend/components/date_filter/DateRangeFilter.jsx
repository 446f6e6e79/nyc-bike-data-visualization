import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDatasetState, normalizeBounds } from '../../hooks/useDatasetDateRange'
import { getBoundaryIndex, indexToDate, buildMarkers, buildYearLabels, Handle } from './slider_utils'
import { getAppliedPayload, clampRange } from './utils'
import { MAX_COVERED_MONTHS, MONTH_LABELS } from '../../config.jsx'

/**
 * DateRangeFilter component provides an interactive slider for selecting a date range based on the dataset's coverage.
 * @param {Object} props
 * @param {Object} props.value - The currently applied date range filter value, containing start_date and end_date.
 * @param {Function} props.onCommit - Callback function to commit the selected date range, receiving the payload with start_date and end_date in 'YYYY-MM-DD' format.
 * @returns JSX element representing the date range filter UI, including the slider, markers, year labels, and apply button.
 */
export default function DateRangeFilter({ value, onCommit }) {
    const { dateRange, loading, error } = useDatasetState()
    // Uses the normalizeBounds function to process the date range from the dataset, extracting the minimum date, total number of months
    const bounds = useMemo(
        () => normalizeBounds(dateRange),
        [dateRange?.max_date, dateRange?.min_date],
    )
    const minDate = bounds?.minDate ?? null
    const totalMonths = bounds?.totalMonths ?? 0
    // The maximum window size for the slider is determined by the lesser of the total months available and a predefined constant, ensuring the UI remains manageable even for datasets with extensive date ranges.
    const maxWindowSize = Math.min(totalMonths, MAX_COVERED_MONTHS)
    // By default, the slider will auto-commit to the last available month in the dataset coverage when it first loads
    const defaultRange = useMemo(
        () => (totalMonths > 0 ? { startIndex: totalMonths - 1, endIndex: totalMonths - 1 } : null),
        [totalMonths],
    )
    // Local state to manage the currently selected range of month
    const [range, setRange] = useState(null)
    // State to track whether a commit action is in progress
    const [isCommitting, setIsCommitting] = useState(false)
    // Ref to track whether the default range has been auto-committed, preventing redundant commits when the component first loads 
    const didAutoCommitDefault = useRef(false)

    // When the default range changes (e.g., when the dataset 
    useEffect(() => {
        // If there's no default range (e.g., dataset has no date coverage), do nothing. 
        if (!defaultRange) return
        // Otherwise, if the default range is different from the current range, update the range state to the default range
        didAutoCommitDefault.current = false
        setRange((current) => (current?.startIndex === defaultRange.startIndex && current?.endIndex === defaultRange.endIndex) ? current : defaultRange)
    }, [defaultRange])

    // Memoized selection object that calculates the start and end dates based on the current range of month indices 
    const selection = useMemo(() => {
        if (!range || !minDate) return null
        const endDate = indexToDate(range.endIndex, minDate)
        return {
            startIndex: range.startIndex,
            endIndex: range.endIndex,
            startDate: indexToDate(range.startIndex, minDate),
            endDate: new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0),
            monthCount: range.endIndex - range.startIndex + 1,
        }
    }, [minDate, range])

    // When the selection changes, a commit payload is generated containing the start and end dates formatted for the API
    const commitPayload = useMemo(() => {
        if (!selection) return null
        return getAppliedPayload({
            start_date: selection.startDate,
            end_date: selection.endDate,
        })
    }, [selection])

    // The applied payload is derived from the current value prop, ensuring that it is always snapped to whole-month boundaries for accurate comparison with the selected range.
    const appliedPayload = useMemo(
        () => getAppliedPayload(value),
        [value?.start_date, value?.end_date, value?.startDate, value?.endDate],
    )

    // When the commit payload changes, if it differs from the applied payload, commit the new payload using the onCommit callback. 
    useEffect(() => {
        // If there's no commit payload, do nothing
        if (!commitPayload || !onCommit || didAutoCommitDefault.current) return
        // Otherwise, if the commit payload differs from the applied payload, call the onCommit function with the new payload and mark that the default auto-commit has been performed to avoid redundant commits in the future.
        didAutoCommitDefault.current = true
        onCommit(commitPayload)
    }, [commitPayload, onCommit])

    // Determine if there are pending changes by comparing the current commit payload with the applied payload
    const hasPendingChanges = useMemo(
        () => Boolean(commitPayload) && !(commitPayload?.start_date === appliedPayload?.start_date && commitPayload?.end_date === appliedPayload?.end_date),
        [appliedPayload, commitPayload],
    )

    // Function to update the selected range, ensuring it is clamped within valid bounds and only updates the state if the new range differs from the current range to prevent unnecessary re-renders.
    const updateRange = useCallback((nextRange) => {
        if (totalMonths === 0) return
        setRange((current) => {
            const normalizedRange = clampRange(nextRange, totalMonths, maxWindowSize)
            // If the normalized range is the same as the current range, return the current range to avoid unnecessary state updates; otherwise, update to the new normalized range.
            return (current?.startIndex === normalizedRange?.startIndex && current?.endIndex === normalizedRange?.endIndex) ? current : normalizedRange
        })
    }, [maxWindowSize, totalMonths])

    // Function to handle resizing the start of the selection window
    const resizeStart = useCallback((nextStartIndex) => {
        if (!selection) return
        const minStartIndex = Math.max(0, selection.endIndex - maxWindowSize + 1)
        updateRange({
            // Clamp the next start
            startIndex: Math.min(selection.endIndex, Math.max(nextStartIndex, minStartIndex)),
            endIndex: selection.endIndex,
        })
    }, [maxWindowSize, selection, updateRange])

    // Function to handle resizing the end of the selection window
    const resizeEnd = useCallback((nextEndIndex) => {
        if (!selection) return
        const maxEndIndex = Math.min(totalMonths - 1, selection.startIndex + maxWindowSize - 1)
        updateRange({
            startIndex: selection.startIndex,
            // Clamp the next end index
            endIndex: Math.min(maxEndIndex, Math.max(nextEndIndex, selection.startIndex)),
        })
    }, [maxWindowSize, selection, totalMonths, updateRange])

    // Function to handle moving the entire selection window
    const moveWindow = useCallback((nextStartIndex) => {
        if (!selection) return
        const maxStartIndex = Math.max(0, totalMonths - selection.monthCount)
        const startIndex = Math.min(maxStartIndex, Math.max(nextStartIndex, 0))
        updateRange({
            startIndex,
            endIndex: startIndex + selection.monthCount - 1,
        })
    }, [selection, totalMonths, updateRange])

    // Pointer movement is converted to month boundaries, which keeps dragging snapped to discrete months no matter the track width.
    const beginPointerAction = useCallback((event, mode) => {
        if (!selection) return
        event.preventDefault()
        event.stopPropagation()
        const track = event.currentTarget.closest('[data-month-slider]')
        if (!track) return
        const rect = track.getBoundingClientRect()
        const pointerOffset = getBoundaryIndex(event.clientX, rect, totalMonths) - selection.startIndex
        // The pointer move handler calculates the next boundary index based on the current pointer position and the initial offset
        const handleMove = (moveEvent) => {
            const nextBoundary = getBoundaryIndex(moveEvent.clientX, rect, totalMonths)
            if (mode === 'resize-start') {
                resizeStart(nextBoundary)
                return
            }
            if (mode === 'resize-end') {
                resizeEnd(nextBoundary - 1)
                return
            }
            moveWindow(nextBoundary - pointerOffset)
        }
        // The pointer up handler removes the event listeners to stop tracking pointer movements once the user releases the pointer.
        const handleUp = () => {
            window.removeEventListener('pointermove', handleMove)
            window.removeEventListener('pointerup', handleUp)
        }
        // Attach event listeners to the window to track pointer movements and handle the end of the pointer interaction.
        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', handleUp)
    }, [moveWindow, resizeEnd, resizeStart, selection, totalMonths])

    // The apply button triggers the onCommit callback with the current commit payload, but only if there are pending changes and a commit is not already in progress. It also manages the isCommitting state to provide feedback to the user while the commit action is being processed.
    const handleApply = useCallback(async () => {
        if (!commitPayload || !onCommit || !hasPendingChanges || isCommitting) return

        setIsCommitting(true)
        try {
            await onCommit(commitPayload)
        } finally {
            setIsCommitting(false)
        }
    }, [commitPayload, hasPendingChanges, isCommitting, onCommit])

    // Building computed data for rendering the slider, including the markers for each month and the year labels, which are memoized to optimize performance by avoiding unnecessary recalculations on each render.
    const markers = useMemo(() => buildMarkers(selection, minDate, totalMonths), [minDate, selection, totalMonths])
    const yearLabels = useMemo(() => buildYearLabels(minDate, totalMonths), [minDate, totalMonths])

    // If the component is still loading data, has encountered an error, or if the necessary bounds and selection data are not available, it returns null to avoid rendering the slider until all required information is ready.
    if (loading || error || !bounds || !selection) return null

    const dateLabel = `${MONTH_LABELS[selection.startDate.getMonth()]} ${selection.startDate.getFullYear()}${selection.monthCount === 1 ? '' : ` → ${MONTH_LABELS[selection.endDate.getMonth()]} ${selection.endDate.getFullYear()}`}`

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
                    '--date-range-filter-selection-start': selection.startIndex,
                    '--date-range-filter-selection-span': selection.monthCount,
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
                        <Handle
                            side="start"
                            value={selection.startIndex}
                            min={0}
                            max={selection.endIndex}
                            label={MONTH_LABELS[selection.startDate.getMonth()]}
                            onStep={resizeStart}
                        />
                    </div>

                    {/* End handle */}
                    <div
                        onPointerDown={(event) => beginPointerAction(event, 'resize-end')}
                        className="date-range-filter__handle-anchor date-range-filter__handle-anchor--end"
                    >
                        <Handle
                            side="end"
                            value={selection.endIndex}
                            min={selection.startIndex}
                            max={totalMonths - 1}
                            label={MONTH_LABELS[indexToDate(selection.endIndex, minDate).getMonth()]}
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
