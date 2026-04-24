import { useIsFetching } from "@tanstack/react-query";

/**
 * Handler hook. Returns the number of in-flight React Query fetches excluding
 * the dataset date-range query, falling back to 0 when no QueryClient is
 * available (useful for isolated tests / storybook-style renders).
 * @returns {number} Count of active fetches (0 when QueryClient is absent).
 */
export default function useSafeIsFetching() {
    try {
        return useIsFetching({
            predicate: (query) => query.queryKey?.[0] !== "dataset-date-range",
        });
    } catch (hookError) {
        if (!String(hookError?.message).includes("No QueryClient set"))
            throw hookError;
        return 0;
    }
}
