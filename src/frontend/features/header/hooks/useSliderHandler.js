import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBoundaryIndex, indexToDate } from '../utils/build_slider.jsx'
import { clampRange } from '../utils/date_formatter.jsx'

/**
 * Centralizes month-slider range state and interaction handlers.
 * @param {Object} params
 * @param {number} params.totalMonths - Number of available months in the dataset.
 * @param {number} params.maxWindowSize - Maximum selectable window size.
 * @param {Date|null} params.minDate - Minimum month date in the dataset coverage.
 * @param {{startIndex: number, endIndex: number}|null} params.defaultRange - Initial/default range for the slider.
 * @returns {{range: Object|null, selection: Object|null, resizeStart: Function, resizeEnd: Function, beginPointerAction: Function}}
 */
export default function useSliderHandler({ totalMonths, maxWindowSize, minDate, defaultRange }) {
	const [range, setRange] = useState(null)
    // Memoized selection object that derives the currently selected date range 
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
    // Effect to initialize the range state based on the provided defaultRange prop
	useEffect(() => {
		if (!defaultRange) return
		setRange((current) => (
			current?.startIndex === defaultRange.startIndex
			&& current?.endIndex === defaultRange.endIndex
		) ? current : defaultRange)
	}, [defaultRange])
    // Callback to update the range state with a new proposed range
	const updateRange = useCallback((nextRange) => {
		if (totalMonths === 0) return
		setRange((current) => {
			const normalizedRange = clampRange(nextRange, totalMonths, maxWindowSize)
			return (
				current?.startIndex === normalizedRange?.startIndex
				&& current?.endIndex === normalizedRange?.endIndex
			) ? current : normalizedRange
		})
	}, [maxWindowSize, totalMonths])
    // Callback to handle resizing the start of the range
	const resizeStart = useCallback((nextStartIndex) => {
		if (!selection) return
		const minStartIndex = Math.max(0, selection.endIndex - maxWindowSize + 1)
		updateRange({
			startIndex: Math.min(selection.endIndex, Math.max(nextStartIndex, minStartIndex)),
			endIndex: selection.endIndex,
		})
	}, [maxWindowSize, selection, updateRange])
    // Callback to handle resizing the end of the range
	const resizeEnd = useCallback((nextEndIndex) => {
		if (!selection) return
		const maxEndIndex = Math.min(totalMonths - 1, selection.startIndex + maxWindowSize - 1)
		updateRange({
			startIndex: selection.startIndex,
			endIndex: Math.min(maxEndIndex, Math.max(nextEndIndex, selection.startIndex)),
		})
	}, [maxWindowSize, selection, totalMonths, updateRange])
    // Callback to handle the beginning of a pointer interaction for moving or resizing the range, setting up event listeners for pointer movement and release to update the range accordingly
	const moveWindow = useCallback((nextStartIndex) => {
		if (!selection) return
		const maxStartIndex = Math.max(0, totalMonths - selection.monthCount)
		const startIndex = Math.min(maxStartIndex, Math.max(nextStartIndex, 0))
		updateRange({
			startIndex,
			endIndex: startIndex + selection.monthCount - 1,
		})
	}, [selection, totalMonths, updateRange])
    // Handler for pointer down events on the slider track or handles
	const beginPointerAction = useCallback((event, mode) => {
		if (!selection) return
		event.preventDefault()
		event.stopPropagation()

		const track = event.currentTarget.closest('[data-month-slider]')
		if (!track) return

		const rect = track.getBoundingClientRect()
		const pointerOffset = getBoundaryIndex(event.clientX, rect, totalMonths) - selection.startIndex

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

		const handleUp = () => {
			window.removeEventListener('pointermove', handleMove)
			window.removeEventListener('pointerup', handleUp)
		}

		window.addEventListener('pointermove', handleMove)
		window.addEventListener('pointerup', handleUp)
	}, [moveWindow, resizeEnd, resizeStart, selection, totalMonths])

	return {
		range,
		selection,
		resizeStart,
		resizeEnd,
		beginPointerAction,
	}
}
