import { QueryClient } from '@tanstack/react-query'

/**
 * Centralized QueryClient instance for the application, configured with sensible defaults for retry behavior, refetching, and data freshness.
 * This client can be imported and used across the app to ensure consistent data fetching behavior and caching.
 * Those value are defaults and can be overridden on a per-query basis if needed.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,  // Don't refetch on window tabs back
      staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
      gcTime: 30 * 60 * 1000, // Data is garbage collected after 30 minutes
    },
  },
})
