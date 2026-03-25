/**Slider Utilities */
import { useCallback } from 'react'

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Calculate the month index corresponding to a pointer event's clientX position relative to the track's bounding rectangle, ensuring the result is clamped within valid bounds.
export function getBoundaryIndex(clientX, rect, totalMonths) {
  if (rect.width === 0 || totalMonths <= 1) return 0
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  return Math.min(Math.round(ratio * totalMonths), Math.max(totalMonths, 0))
}

// Convert a zero-based month index back to a Date object using the minimum date as reference
export function indexToDate(index, minDate) {
  return new Date(minDate.getFullYear(), minDate.getMonth() + index, 1)
}

// Build an array of marker objects for each month in the dataset coverage, determining their label, selection state, and whether they represent a year boundary for styling purposes. 
export function buildMarkers(selection, minDate, totalMonths) {
  if (!selection || !minDate) return []

  return Array.from({ length: totalMonths }, (_, index) => {
    const monthDate = indexToDate(index, minDate)
    const isBoundary = index === 0 || index === totalMonths - 1
    const isQuarter = monthDate.getMonth() % 3 === 0

    return {
      key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
      label: totalMonths <= 12 || isBoundary || isQuarter ? MONTH_LABELS[monthDate.getMonth()] : '',
      isSelected: index >= selection.startIndex && index <= selection.endIndex,
      isYearStart: monthDate.getMonth() === 0 && index !== 0,
    }
  })
}

// Build an array of year label objects containing the year and its corresponding left position percentage for styling, based on the dataset coverage and minimum date.
export function buildYearLabels(minDate, totalMonths) {
  if (!minDate || totalMonths === 0) return []

  const yearSpans = new Map()

  for (let index = 0; index < totalMonths; index += 1) {
    const year = indexToDate(index, minDate).getFullYear()
    const existingSpan = yearSpans.get(year)

    if (!existingSpan) {
      yearSpans.set(year, { year, firstIndex: index, lastIndex: index })
      continue
    }

    existingSpan.lastIndex = index
  }

  return Array.from(yearSpans.values()).map(({ year, firstIndex, lastIndex }) => ({
    year,
    left: ((((firstIndex + lastIndex) / 2) + 0.5) / totalMonths) * 100,
  }))
}

// Handle component represents the draggable handles for resizing the date range selection, supporting keyboard interactions for accessibility by allowing users to step through months using arrow keys.
export function Handle({ side, value, min, max, label, onStep }) {
  // Handle left and right arrow keys to step through months, ensuring the value stays within the provided min and max bounds.
  const handleKeyDown = useCallback((event) => {
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
    if (!step) return

    event.preventDefault()
    onStep(value + step)
  }, [onStep, value])

  // Render a button element for the handle, with appropriate ARIA attributes for accessibility, and styling classes based on the side (start or end) of the handle.
  return (
    <button
      type="button"
      role="slider"
      aria-label={side === 'start' ? 'Start month handle' : 'End month handle'}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={label}
      onKeyDown={handleKeyDown}
      className={`date-range-filter__handle date-range-filter__handle--${side}`}
    >
      <div className="date-range-filter__handle-line" />
    </button>
  )
}

