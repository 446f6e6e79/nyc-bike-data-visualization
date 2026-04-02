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

/**
 *  Takes various date formats from the API and normalizes them to a Date object
 * @param {*} dateValue - The date value to parse, expected to be in 'YYYY-MM-DD' 
 * @returns 
*/
function parseApiDate(dateValue) {
    if (typeof dateValue !== 'string') return null
    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    // If no match, the date format is unrecognized, so we return null to indicate an invalid date.
    if (!match) return null
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** Normalizes the date range by adjusting the minimum date to the first day of its month and the maximum date to the last day of its month, while also calculating the total number of months in the range.
 * @param {Object} dateRange - An object containing min_date and max_date properties
 * @returns An object with normalized minDate, maxDate, and totalMonths, or null if the input dates are invalid
 */
export function normalizeBounds(dateRange) {
    const minDate = parseApiDate(dateRange?.min_date)
    const maxDate = parseApiDate(dateRange?.max_date)
    
    if (!minDate || !maxDate) return null

    const normalizedMinDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    const normalizedMaxDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)
    // Calculate total months in the range, inclusive of both min and max months
    const totalMonths = ( normalizedMaxDate.getFullYear() - normalizedMinDate.getFullYear() ) * 12 + (normalizedMaxDate.getMonth() - normalizedMinDate.getMonth()) + 1

    return {
        minDate: normalizedMinDate,
        maxDate: normalizedMaxDate,
        totalMonths,
    }
}