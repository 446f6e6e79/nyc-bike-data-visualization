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
} from "../../../utils/editorialTokens.js";
import { WMO_WEATHER_CODES } from "../utils/wmo_code_handler.jsx";
import {
    toRgba,
    buildRidgelineSeries,
    buildTickText,
    wrapLabel,
} from "../utils/weather_ridgeline.js";

/**
 * Ridgeline plot of rides-per-hour distributions broken down by WMO weather
 * code, toggleable between hour-of-day and day-of-week dimensions.
 * @param {Array<object>} data - Raw weather stats rows from the backend.
 * @param {boolean} loading - Whether a refetch is currently in flight.
 * @param {unknown} error - Error object from the query, if any.
 * @param {Function} onRefetch - Handler invoked when the overlay requests a retry.
 * @returns {JSX.Element} The ridgeline frame with toolbar and Plotly chart.
 */
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
                        smoothing: 0.5,
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
                                    standoff: 50,
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
                                automargin: true,
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
