import { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import StatusMessage from "../../../components/StatusMessage";
import {
    FONT_MONO,
    INK,
    INK_MUTED,
    PAPER_RAISED,
    RULE,
    FONT_DISPLAY,
    RULE_STRONG,
} from "../../../utils/editorialTokens.js"
import {
    GROUPED_WEATHER_CODES,
    WMO_WEATHER_CODES,
    getWeatherGroup,
} from "../utils/wmo_code_handler.jsx";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toRgba(hexColor, alpha) {
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

function getWeatherColorByCode(code) {
    const weatherGroup = getWeatherGroup(code);
    return GROUPED_WEATHER_CODES[weatherGroup]?.[1] ?? "#6e6a62";
}

function buildRidgelineSeries(rows = [], dimension = "hour") {
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

    const orderedCodes = [...weatherBuckets.keys()].sort((codeA, codeB) => {
        const sumA = [...weatherBuckets.get(codeA).values()].reduce((sum, value) => sum + value, 0);
        const sumB = [...weatherBuckets.get(codeB).values()].reduce((sum, value) => sum + value, 0);
        return sumB - sumA;
    });

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

function buildTickText(dimension) {
    if (dimension === "hour") {
        return Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
    }

    return WEEKDAY_LABELS;
}

function wrapLabel(text, maxLen = 18) {
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

function WeatherRidgeline({ data, loading, error, onRefetch }) {
    const [dimension, setDimension] = useState("hour");
    const showOverlay = loading || error;

    const ridges = useMemo(() => buildRidgelineSeries(data ?? [], dimension), [data, dimension]);

    const traces = useMemo(
        () =>
            ridges.flatMap((ridge) => {
                const baselineTrace = {
                    type: "scatter",
                    mode: "lines",
                    x: ridge.x,
                    y: ridge.x.map(() => ridge.baseline),
                    line: { color: "rgba(0,0,0,0)", width: 0 },
                    hoverinfo: "skip",
                    showlegend: false,
                };

                const ridgeTrace = {
                    type: "scatter",
                    mode: "lines",
                    x: ridge.x,
                    y: ridge.y,
                    name: ridge.label,
                    line: { 
                        color: ridge.color, 
                        width: 1.5,
                        shape: "spline",
                        smoothing: .5
                    },
                    fill: "tonexty",
                    fillcolor: toRgba(ridge.color, 0.24),
                    hovertemplate:
                        `<b>${ridge.label}</b><br>` +
                        (dimension === "hour"
                            ? "Moment: <b>%{x:02d}:00</b><br>"
                            : "Moment: <b>%{x}</b><br>") +
                        "Density: <b>%{customdata:.2f}</b><extra></extra>",
                    customdata: ridge.rawSeries,
                    showlegend: false,
                };

                return [baselineTrace, ridgeTrace];
            }),
        [ridges, dimension],
    );

    const yTickValues = ridges.map((ridge) => ridge.baseline + 0.38);
    const yTickText = ridges.map((r) =>
        wrapLabel(
            (WMO_WEATHER_CODES[r.code] ?? `WMO ${r.code}`)
                .replace("Moderate", "Mod.")
                .replace("Slight", "Slt.")
                .replace("Heavy", "Hvy.")
        )
    );
    const xTicks = dimension === "hour" ? Array.from({ length: 24 }, (_, index) => index) : Array.from({ length: 7 }, (_, index) => index);
    const hasData = ridges.length > 0;

    return (
        <div className={`weather-ridgeline-frame${showOverlay ? " weather-ridgeline-frame--hidden" : ""}`}>
            <div className="weather-ridgeline-toolbar">
                <p className="weather-ridgeline-toolbar__title">Weather distributions</p>
                <div className="weather-ridgeline-toggle" role="tablist" aria-label="Ridgeline dimension">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={dimension === "hour"}
                        className={`weather-ridgeline-toggle__btn${dimension === "hour" ? " is-active" : ""}`}
                        onClick={() => setDimension("hour")}
                    >
                        By Hour
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={dimension === "day_of_week"}
                        className={`weather-ridgeline-toggle__btn${dimension === "day_of_week" ? " is-active" : ""}`}
                        onClick={() => setDimension("day_of_week")}
                    >
                        By Weekday
                    </button>
                </div>
            </div>

            <div className="weather-ridgeline-plot">
                {hasData ? (
                    <Plot
                        data={traces}
                        layout={{
                            paper_bgcolor: PAPER_RAISED,
                            plot_bgcolor: PAPER_RAISED,
                            margin: { l: 94, r: 24, t: 18, b: 52, pad: 10 },
                            hovermode: "closest",
                            dragmode: false,
                            autosize: true,
                            xaxis: {
                                title: {
                                    text: dimension === "hour" ? "Hour of Day" : "Day of Week",
                                    font: { family: FONT_DISPLAY, size: 13, weight: "500" },
                                    standoff: 50 
                                },
                                tickmode: "array",
                                tickvals: xTicks,
                                ticktext: buildTickText(dimension),
                                tickfont: { family: FONT_MONO, size: 10, color: INK_MUTED },
                                gridcolor: RULE,
                                zerolinecolor: RULE_STRONG,
                            },
                            yaxis: {
                                title: {
                                    text: "Weather",
                                    font: { family: FONT_DISPLAY, size: 13, weight: "500" },
                                },
                                tickmode: "array",
                                tickvals: yTickValues,
                                ticktext: yTickText,
                                tickfont: { family: FONT_MONO, size: 10, color: INK_MUTED },
                                showgrid: false,
                                zeroline: false,
                                fixedrange: true,
                                automargin: true
                            },
                            hoverlabel: {
                                bgcolor: "rgba(11, 12, 14, 0.94)",
                                bordercolor: "rgba(25, 83, 216, 0.72)",
                                align: "left",
                                namelength: -1,
                                font: { family: FONT_MONO, size: 11, color: "#fbf8f2" },
                            },
                            font: { family: FONT_MONO, size: 11, color: INK },
                        }}
                        config={{ displayModeBar: false, scrollZoom: false }}
                        useResizeHandler
                        className="w-full h-full"
                    />
                ) : (
                    <div className="weather-ridgeline-empty">
                        No weather distributions available for this filter range.
                    </div>
                )}
            </div>

            {showOverlay && <StatusMessage loading={loading} error={error} onRefetch={onRefetch} />}
        </div>
    );
}

export default WeatherRidgeline;
