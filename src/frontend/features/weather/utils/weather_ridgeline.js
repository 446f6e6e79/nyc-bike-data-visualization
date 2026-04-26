import {
    GROUPED_WEATHER_CODES,
    WMO_WEATHER_CODES,
    getWeatherGroup,
} from "./wmo_code_handler.jsx";

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Converts a 3- or 6-digit hex color to an rgba() string with the given alpha.
 * Falls back to the editorial accent blue when the input is malformed.
 * @param {string} hexColor - Hex color in "#RGB" or "#RRGGBB" form.
 * @param {number} alpha - Alpha channel in [0, 1].
 * @returns {string} CSS `rgba(...)` color string.
 */
export function toRgba(hexColor, alpha) {
    if (!hexColor?.startsWith("#") || (hexColor.length !== 7 && hexColor.length !== 4)) {
        return `rgba(25, 83, 216, ${alpha})`;
    }

    const expanded =
        hexColor.length === 4
            ? `#${hexColor[1]}${hexColor[1]}${hexColor[2]}${hexColor[2]}${hexColor[3]}${hexColor[3]}`
            : hexColor;

    const red = Number.parseInt(expanded.slice(1, 3), 16);
    const green = Number.parseInt(expanded.slice(3, 5), 16);
    const blue = Number.parseInt(expanded.slice(5, 7), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Resolves the editorial color associated with a WMO weather code, falling
 * back to a neutral grey for unknown codes.
 * @param {number} code - WMO weather code.
 * @returns {string} Hex color string.
 */
export function getWeatherColorByCode(code) {
    const weatherGroup = getWeatherGroup(code);
    return GROUPED_WEATHER_CODES[weatherGroup]?.[1] ?? "#6e6a62";
}

/**
 * Builds normalized ridgeline series (one per weather code) grouped by hour or
 * day-of-week. Each series carries baseline + y values and a raw rides-per-hour
 * array for tooltip display.
 * @param {Array<object>} rows - Stats rows from the weather endpoint.
 * @param {"hour"|"day_of_week"} dimension - Bucket dimension.
 * @returns {Array<object>} Ordered ridgeline descriptors ready for Plotly.
 */
export function buildRidgelineSeries(rows = [], dimension = "hour") {
    const bins = dimension === "hour" ? Array.from({ length: 24 }, (_, index) => index) : Array.from({ length: 7 }, (_, index) => index);
    const bucketKey = dimension === "hour" ? "hour" : "day_of_week";

    const weatherBuckets = new Map();

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const weatherCode = Number(row?.weather_code);
        const bucket = Number(row?.[bucketKey]);

        if (!Number.isFinite(weatherCode) || !Number.isFinite(bucket) || !bins.includes(bucket)) {
            continue;
        }

        const totalRides = Number(row?.total_rides ?? 0);
        const hoursCount = Number(row?.hours_count ?? 0);
        const ridesPerHour = hoursCount > 0 ? totalRides / hoursCount : 0;

        if (!weatherBuckets.has(weatherCode)) {
            weatherBuckets.set(weatherCode, new Map());
        }

        const bucketMap = weatherBuckets.get(weatherCode);
        bucketMap.set(bucket, (bucketMap.get(bucket) ?? 0) + ridesPerHour);
    }

    const orderedCodes = [...weatherBuckets.keys()].sort((a, b) => b - a);

    const spacing = 1.2;
    const amplitude = 0.9;

    return orderedCodes.map((code, index) => {
        const bucketMap = weatherBuckets.get(code);
        const rawSeries = bins.map((bucket) => Number(bucketMap.get(bucket) ?? 0));
        const localMax = rawSeries.reduce((max, value) => Math.max(max, value), 0);
        const normalized = localMax > 0 ? rawSeries.map((value) => value / localMax) : rawSeries.map(() => 0);
        const baseline = index * spacing;

        return {
            code,
            label: WMO_WEATHER_CODES[code] ?? `WMO ${code}`,
            color: getWeatherColorByCode(code),
            x: bins,
            rawSeries,
            baseline,
            y: normalized.map((value) => baseline + value * amplitude),
        };
    });
}

/**
 * Produces the x-axis tick labels for the ridgeline given the chosen dimension.
 * @param {"hour"|"day_of_week"} dimension - Bucket dimension.
 * @returns {string[]} Ordered tick labels.
 */
export function buildTickText(dimension) {
    if (dimension === "hour") {
        return Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
    }

    return WEEKDAY_LABELS;
}

/**
 * Wraps a label to avoid overflowing the ridgeline y-axis, splitting on word
 * boundaries with a `\n` separator (Plotly renders these as multi-line ticks).
 * @param {string} text - Original label text.
 * @param {number} [maxLen=18] - Soft line-length budget.
 * @returns {string} Wrapped label.
 */
export function wrapLabel(text, maxLen = 18) {
    const words = text.split(" ");
    let lines = [];
    let current = "";

    for (const word of words) {
        if ((current + " " + word).trim().length > maxLen) {
            lines.push(current);
            current = word;
        } else {
            current = (current + " " + word).trim();
        }
    }

    if (current) lines.push(current);

    return lines.join("\n");
}
