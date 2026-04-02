import { useMemo } from 'react'
import { buildMarkers, buildYearLabels } from '../utils/build_slider.jsx'
import { MONTH_LABELS } from '../../../utils/config.jsx'

/**
 * Derives UI-facing labels, markers, and state flags for DateRangeFilter.
 * @param {Object} params
 * @param {Object|null} params.selection - Current slider selection.
 * @param {Date|null} params.minDate - Minimum dataset date.
 * @param {number} params.totalMonths - Total months in dataset bounds.
 * @param {boolean} params.loading - Whether date range data is loading.
 * @param {string|null} params.error - Error message from date range fetch.
 * @param {Object|null} params.bounds - Normalized bounds object.
 * @returns {{markers: Array, yearLabels: Array, dateLabel: string, isLoadingView: boolean, isUnavailableView: boolean}}
 */
export default function useDatePresentation({ selection, minDate, totalMonths, loading, error, bounds }) {
    // Memoized markers for the slider based on the current selection, minimum date, and total months in the dataset.
    const markers = useMemo(
        () => buildMarkers(selection, minDate, totalMonths),
        [minDate, selection, totalMonths],
    )
    // Memoized year labels for the slider based on the minimum date and total months in the dataset.
    const yearLabels = useMemo(
        () => buildYearLabels(minDate, totalMonths),
        [minDate, totalMonths],
    )
    // Memoized date label that formats the currently selected date range into a human-readable string, showing the month and year for the start and end of the selection.
    const dateLabel = useMemo(() => {
        if (!selection) return ''
        return `${MONTH_LABELS[selection.startDate.getMonth()]} ${selection.startDate.getFullYear()}${selection.monthCount === 1 ? '' : ` -> ${MONTH_LABELS[selection.endDate.getMonth()]} ${selection.endDate.getFullYear()}`}`
    }, [selection])
    // Memoized boolean flag to determine if the view should show a loading state, which is true if the date range data is currently loading or if there is no current selection.
    const isLoadingView = loading || !selection
    const isUnavailableView = !isLoadingView && (Boolean(error) || !bounds)

    return {
        markers,
        yearLabels,
        dateLabel,
        isLoadingView,
        isUnavailableView,
    }
}