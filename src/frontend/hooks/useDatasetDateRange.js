import { useQuery } from '@tanstack/react-query'
import { fetchDateRangeStats } from '../api-data/statsApi'

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