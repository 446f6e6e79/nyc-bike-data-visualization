import { MONTH_LABELS } from '../../../config.jsx'
 
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
