import { useMemo } from "react";
import { useApiQueriesWithFilters } from "../../../clients/baseApiQuery.js";
import { fetchStats } from "../services/statsApi.js";
import {
    createLayerQueries,
    hasDateRange,
    stripClassFilters,
} from "../utils/compare_layers.js";

/**
 * Fetch hook. Runs every breakdown (day×hour, day, hour, date) for each
 * pinned comparison layer in parallel via the shared /clients query helper,
 * then regroups results by layer id for consumer components.
 * @param {object} params - Hook parameters.
 * @param {object} params.filters - Global filters (date range, etc.).
 * @param {Array<{id:string, filters?:object}>} params.layers - Pinned comparison layers.
 * @param {boolean} params.enabled - Master switch for executing the queries.
 * @returns {{ layerData: Array<object>, loading: boolean, error: string|null, refetch: Function }}
 *   Grouped per-layer data plus aggregated loading/error/refetch handles.
 */
export default function useCompareTemporalLayers({ filters = {}, layers = [], enabled = false }) {
    const baseFilters = useMemo(() => stripClassFilters(filters), [filters]);

    const queryDescriptors = useMemo(
        () => layers.flatMap((layer) => createLayerQueries(baseFilters, layer)),
        [layers, baseFilters],
    );

    const queryResults = useApiQueriesWithFilters(
        queryDescriptors.map(({ layerId, kind, params }) => ({
            queryKey: ["temporal-compare", layerId, kind],
            fetcher: fetchStats,
            filters: params,
            enabledWhen: (filterValues) => enabled && hasDateRange(filterValues),
            staleTime: 60_000,
        })),
    );

    const layerData = useMemo(() => {
        const byLayer = new Map();

        for (let i = 0; i < queryDescriptors.length; i++) {
            const descriptor = queryDescriptors[i];
            const result = queryResults[i];
            const layerBucket = byLayer.get(descriptor.layerId) ?? {};

            layerBucket[descriptor.kind] = result?.data ?? [];
            layerBucket.loading = Boolean(layerBucket.loading || result?.isLoading || result?.isFetching);
            layerBucket.error = layerBucket.error ?? result?.error?.message ?? null;
            byLayer.set(descriptor.layerId, layerBucket);
        }

        return layers.map((layer) => ({
            id: layer.id,
            dayHourStats: byLayer.get(layer.id)?.dayHourStats ?? [],
            dayStats: byLayer.get(layer.id)?.dayStats ?? [],
            hourStats: byLayer.get(layer.id)?.hourStats ?? [],
            dateStats: byLayer.get(layer.id)?.dateStats ?? [],
            loading: byLayer.get(layer.id)?.loading ?? false,
            error: byLayer.get(layer.id)?.error ?? null,
        }));
    }, [layers, queryDescriptors, queryResults]);

    const loading = queryResults.some((result) => result.isLoading || result.isFetching);
    const error = queryResults.find((result) => result.error)?.error?.message ?? null;

    const refetch = () => Promise.all(queryResults.map((result) => result.refetch?.()));

    return {
        layerData,
        loading,
        error,
        refetch,
    };
}
