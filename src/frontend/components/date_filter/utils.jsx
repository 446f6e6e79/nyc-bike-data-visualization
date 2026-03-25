// Logic utilities for the date filter component

/**
 * Transform the selected start and end dates into a payload format suitable for committing, ensuring that the dates are snapped to whole-month boundaries and formatted as 'YYYY-MM-DD' strings for API compatibility.
 * @param {*} value 
 * @returns 
 */
export function getAppliedPayload(value) {
    // Convert a Date object to a 'YYYY-MM-DD' string
    const formatDateParam = (date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    // Extract start and end dates from the value, supporting both snake_case and camelCase keys, and ensuring they are valid Date objects before proceeding.
    const startDate = value?.start_date instanceof Date ? value.start_date : value?.startDate instanceof Date ? value.startDate : null
    const endDate = value?.end_date instanceof Date ? value.end_date : value?.endDate instanceof Date ? value.endDate : null
    if (!startDate || !endDate) return null

    return {
        start_date: formatDateParam(new Date(startDate.getFullYear(), startDate.getMonth(), 1)),
        end_date: formatDateParam(new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0)),
    }
}

/**
 * Take a proposed next range of month indices and clamp it within the valid bounds of the dataset coverage, ensuring that the resulting range does not exceed the maximum window size and that the start index is always less than or equal to the end index.
 * @param {*} nextRange 
 * @param {*} totalMonths 
 * @param {*} maxWindowSize 
 * @returns 
 */
export function clampRange(nextRange, totalMonths, maxWindowSize) {
    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value))
    }
    const rawStartIndex = clamp(nextRange.startIndex, 0, totalMonths - 1)
    const rawEndIndex = clamp(nextRange.endIndex, rawStartIndex, totalMonths - 1)
    const monthCount = clamp(rawEndIndex - rawStartIndex + 1, 1, maxWindowSize)
    const endIndex = rawEndIndex
    const startIndex = clamp(endIndex - monthCount + 1, 0, endIndex)

    return { startIndex, endIndex }
}
