import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Utility functions to create a smoke test QueryClient
export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    })
}

// Wrapper component to provide React Query context for testing hooks that use it
export function createQueryWrapper() {
    const queryClient = createTestQueryClient()

    function QueryWrapper({ children }) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        )
    }

    return QueryWrapper
}
