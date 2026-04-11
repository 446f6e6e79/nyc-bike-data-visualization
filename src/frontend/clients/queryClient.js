import { QueryClient } from '@tanstack/react-query'

/** Centralized QueryClient instance for the application, configured with sensible defaults for retry behavior, refetching, and data freshness. */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,  // Don't refetch on window tabs back
            refetchOnMount: false,        // Don't refetch when component mounts if data is fresh
            staleTime: 15 * 60 * 1000,    // Default data freshness: 15 minutes
            gcTime: 30 * 60 * 1000,       // Default cache garbage collection: 30 minutes
        },
    },
})