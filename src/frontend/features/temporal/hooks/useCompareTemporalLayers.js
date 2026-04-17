import { useMemo } from "react"
import { useQueries } from "@tanstack/react-query"
import { fetchStats } from "../../../services/statsApi.js"

function hasDateRange(filters = {}) {
    return Boolean(filters.start_date && filters.end_date)
}

function compactFilters(filters = {}) {
    return Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== "")
    )
}

function stripClassFilters(filters = {}) {
    const { user_type, bike_type, ...rest } = filters
    return rest
}

function createLayerQueries(baseFilters, layer) {
    const layerFilters = compactFilters({ ...baseFilters, ...(layer.filters ?? {}) })

    return [
        {
            layerId: layer.id,
            kind: "dayHourStats",
            params: { ...layerFilters, group_by: "day_of_week,hour" },
        },
        {
            layerId: layer.id,
            kind: "dayStats",
            params: { ...layerFilters, group_by: "day_of_week" },
        },
        {
            layerId: layer.id,
            kind: "hourStats",
            params: { ...layerFilters, group_by: "hour" },
        },
    ]
}

/**
 * Fetches temporal datasets for additional comparison layers.
 * Each layer receives day-hour, day-only and hour-only stats in parallel.
 */
export default function useCompareTemporalLayers({ filters = {}, layers = [], enabled = false }) {
    const baseFilters = useMemo(() => stripClassFilters(filters), [filters])

    const queryDescriptors = useMemo(
        () => layers.flatMap((layer) => createLayerQueries(baseFilters, layer)),
        [layers, baseFilters]
    )

    const queryResults = useQueries({
        queries: queryDescriptors.map(({ layerId, kind, params }) => ({
            queryKey: ["temporal-compare", layerId, kind, params],
            queryFn: () => fetchStats(params),
            enabled: enabled && hasDateRange(params),
            staleTime: 60_000,
        })),
    })

    const layerData = useMemo(() => {
        const byLayer = new Map()

        for (let i = 0; i < queryDescriptors.length; i++) {
            const descriptor = queryDescriptors[i]
            const result = queryResults[i]
            const layerBucket = byLayer.get(descriptor.layerId) ?? {}

            layerBucket[descriptor.kind] = result?.data ?? []
            layerBucket.loading = Boolean(layerBucket.loading || result?.isLoading || result?.isFetching)
            layerBucket.error = layerBucket.error ?? result?.error?.message ?? null
            byLayer.set(descriptor.layerId, layerBucket)
        }

        return layers.map((layer) => ({
            id: layer.id,
            dayHourStats: byLayer.get(layer.id)?.dayHourStats ?? [],
            dayStats: byLayer.get(layer.id)?.dayStats ?? [],
            hourStats: byLayer.get(layer.id)?.hourStats ?? [],
            loading: byLayer.get(layer.id)?.loading ?? false,
            error: byLayer.get(layer.id)?.error ?? null,
        }))
    }, [layers, queryDescriptors, queryResults])

    const loading = queryResults.some((result) => result.isLoading || result.isFetching)
    const error = queryResults.find((result) => result.error)?.error?.message ?? null

    const refetch = () => Promise.all(queryResults.map((result) => result.refetch?.()))

    return {
        layerData,
        loading,
        error,
        refetch,
    }
}
