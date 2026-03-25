import { useQuery } from '@tanstack/react-query'
import { fetchDateRangeStats } from '../api-data/statsApi'

/**
 * Helper functions
*/

/**
 *  Takes various date formats from the API and normalizes them to a Date object with time set to 00:00:00.
 * @param {*} value 
 * @returns 
*/
function parseApiDate(value) {
  if (!value) return null
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate())

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

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
  const totalMonths = (normalizedMaxDate.getFullYear() - normalizedMinDate.getFullYear()) * 12 + (normalizedMaxDate.getMonth() - normalizedMinDate.getMonth()) + 1

  return {
    minDate: normalizedMinDate,
    maxDate: normalizedMaxDate,
    totalMonths,
  }
}
/**
 * Custom hook to fetch the dataset date range coverage stats
 * @returns An object containing the date range, loading state, and any error message
 */
export default function useDatasetDateRange() {
  const query = useQuery({
    queryKey: ['dataset-date-range'],
    queryFn: fetchDateRangeStats,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })

  return {
    dateRange: query.data,
    loading: query.isLoading,
    refetch : query.refetch,
    error: query.error?.message ?? null,
  }
}

/** Custom hook to access the dataset date range, providing a fallback state when the hook is used outside of its expected context (e.g., without a QueryClient)
 * @returns An object containing the date range, loading state, and any error message
 */
export function useDatasetState() {
  try {
    return useDatasetDateRange()
  } catch (hookError) {
    if (!String(hookError?.message).includes('No QueryClient set')) throw hookError

    return { dateRange: null, loading: false, error: null }
  }
}


