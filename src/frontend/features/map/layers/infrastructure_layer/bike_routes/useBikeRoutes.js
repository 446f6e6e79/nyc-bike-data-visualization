import { fetchBikeRoutes } from '../../../services/bikeRoutesApi.js'
import useApiQueryWithFilters from '../../../../../clients/baseApiQuery.js'

/**
 * Custom hook to fetch NYC bike route GeoJSON segments.
 * Routes are cached for the session — they change very rarely.
 * @returns {{ bikeRoutes: Array, loading: boolean, error: string|null }}
 */
export default function useBikeRoutes() {
    const query = useApiQueryWithFilters({
        queryKey: 'bike-routes',
        fetcher: fetchBikeRoutes,
        enabledWhen: () => true,             // always fetch; no filters
        staleTime: Number.POSITIVE_INFINITY, // never re-fetch during session
        gcTime: Number.POSITIVE_INFINITY,
        fallbackData: [],
    })

    return {
        bikeRoutes: query.data,
        loading: query.loading,
        error: query.error,
    }
}