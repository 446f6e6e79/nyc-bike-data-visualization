export const COMPARE_LAYER_COLORS = [
    "#1953d8",
    "#c24747",
    "#2f7d4f",
    "#a7701e",
    "#6f52bf",
];

export const COMPARE_LAYER_SCALES = ["Blues", "Reds", "Greens", "Oranges", "Purples"];

export const CLASS_FILTER_KEYS = ["user_type", "bike_type"];

/**
 * Formats a raw filter value (e.g. "classic_bike") into a display label
 * ("Classic Bike"), with a fallback to "All" when the value is empty.
 * @param {string|undefined|null} value - Raw filter value.
 * @returns {string} Human-readable label.
 */
export function formatFilterValue(value) {
    if (!value) return "All";
    return value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Builds the user-facing label for a comparison layer from its class filters.
 * @param {{ user_type?: string, bike_type?: string }} layerFilters - Layer filters.
 * @returns {string} Combined label such as "Member · Classic Bike".
 */
export function buildLayerLabel(layerFilters = {}) {
    const userLabel = formatFilterValue(layerFilters.user_type);
    const bikeLabel = formatFilterValue(layerFilters.bike_type);
    return `${userLabel} · ${bikeLabel}`;
}

/**
 * Stable cache key for a layer's class filters — used to detect duplicates
 * against the base layer and other pinned comparison layers.
 * @param {{ user_type?: string, bike_type?: string }} layerFilters - Layer filters.
 * @returns {string} Pipe-delimited key (e.g. "member|classic_bike").
 */
export function buildLayerKey(layerFilters = {}) {
    return `${layerFilters.user_type ?? "all"}|${layerFilters.bike_type ?? "all"}`;
}

/**
 * Returns a copy of `filters` without the class-level filter keys (user_type,
 * bike_type), so comparison queries can supply those per layer.
 * @param {object} filters - Source filter object.
 * @returns {object} New object with class filters stripped.
 */
export function stripClassFilters(filters = {}) {
    const { user_type, bike_type, ...rest } = filters;
    return rest;
}

/**
 * Whether the provided filter object has both ends of a date range set —
 * used as an `enabled` guard for comparison queries.
 * @param {object} filters - Filter object.
 * @returns {boolean} True when both `start_date` and `end_date` are truthy.
 */
export function hasDateRange(filters = {}) {
    return Boolean(filters.start_date && filters.end_date);
}

/**
 * Drops undefined / null / empty-string entries from a filter object so that
 * query keys stay compact and canonical.
 * @param {object} filters - Source filter object.
 * @returns {object} Compacted filter object.
 */
export function compactFilters(filters = {}) {
    return Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ""),
    );
}

/**
 * Emits the four breakdown query descriptors (day×hour, day, hour, date) for
 * a given comparison layer, tagged with the layer id for later grouping.
 * @param {object} baseFilters - Filters shared by every descriptor.
 * @param {{ id: string, filters?: object }} layer - Comparison layer descriptor.
 * @returns {Array<{ layerId: string, kind: string, params: object }>} Query descriptors.
 */
export function createLayerQueries(baseFilters, layer) {
    const layerFilters = compactFilters({ ...baseFilters, ...(layer.filters ?? {}) });

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
        {
            layerId: layer.id,
            kind: "dateStats",
            params: { ...layerFilters, group_by: "date" },
        },
    ];
}
