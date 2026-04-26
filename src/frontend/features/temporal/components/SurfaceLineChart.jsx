import { useMemo } from "react";
import Plot from "react-plotly.js";
import StatusMessage from "../../../components/StatusMessage.jsx";
import { getMetricConfig } from "../utils/metric_formatter.jsx";
import {
    INK,
    INK_MUTED,
    PAPER_RAISED,
    FONT_MONO,
    RULE,
    RULE_STRONG,
    FONT_DISPLAY,
} from "../../../utils/editorialTokens.js";

function sortRowsByDate(rows = []) {
    return [...rows].sort((a, b) => String(a?.date ?? "").localeCompare(String(b?.date ?? "")));
}

function buildSeries(rows = [], metricGetter) {
    const sortedRows = sortRowsByDate(rows);

    return sortedRows
        .map((row) => {
            const dateValue = row?.date ? String(row.date) : null;
            const metricValue = Number(metricGetter(row));

            if (!dateValue || !Number.isFinite(metricValue)) {
                return null;
            }

            return {
                date: dateValue,
                value: metricValue,
            };
        })
        .filter(Boolean);
}

function SurfaceLineChart({
    dateData,
    activeMetric,
    loading,
    error,
    onRefetch,
    compareMode = false,
    layers = [],
}) {
    const metric = useMemo(() => getMetricConfig(activeMetric), [activeMetric]);
    const showOverlay = loading || error;

    const singleSeries = useMemo(
        () => buildSeries(dateData ?? [], metric.get),
        [dateData, metric],
    );

    const compareTraces = useMemo(() => {
        if (!compareMode || layers.length <= 1) return [];

        return layers
            .map((layer, index) => {
                const series = buildSeries(layer.dateStats ?? [], metric.get);
                if (series.length === 0) return null;

                return {
                    type: "scatter",
                    mode: "lines+markers",
                    name: layer.label,
                    x: series.map((point) => point.date),
                    y: series.map((point) => point.value),
                    line: {
                        color: layer.color,
                        width: index === 0 ? 2.4 : 1.8,
                    },
                    marker: {
                        color: layer.color,
                        size: index === 0 ? 4.2 : 3.2,
                    },
                    hovertemplate:
                        `<b>${layer.label}</b><br>` +
                        "Moment: <b>%{x|%b %d, %Y}</b><br>" +
                        `Rhythm: <b>%{y:.2f}</b> ${metric.unit}<extra></extra>`,
                };
            })
            .filter(Boolean);
    }, [compareMode, layers, metric]);

    const singleTrace = useMemo(
        () => ({
            type: "scatter",
            mode: "lines+markers",
            name: metric.label,
            x: singleSeries.map((point) => point.date),
            y: singleSeries.map((point) => point.value),
            line: {
                color: "#1953d8",
                width: 2.3,
            },
            marker: {
                color: "#1953d8",
                size: 3.8,
            },
            hovertemplate:
                "Moment: <b>%{x|%b %d, %Y}</b><br>" +
                `Rhythm: <b>%{y:.2f}</b> ${metric.unit}<extra></extra>`,
        }),
        [singleSeries, metric],
    );

    const traces = compareTraces.length > 0 ? compareTraces : [singleTrace];
    const hasData = traces.some((trace) => Array.isArray(trace.y) && trace.y.length > 0);

    return (
        <div className={`surface-card${showOverlay ? " surface-card--hidden" : ""}`}>
            <p className="surface-card__eyebrow">
                {metric.label} over selected time range
            </p>

            <div className="surface-chart">
                {hasData ? (
                    <Plot
                        data={traces}
                        layout={{
                            paper_bgcolor: PAPER_RAISED,
                            plot_bgcolor: PAPER_RAISED,
                            margin: { l: 56, r: 20, t: 10, b: 54 },
                            showlegend: compareTraces.length > 0,
                            legend: {
                                orientation: "h",
                                yanchor: "bottom",
                                y: 1.02,
                                xanchor: "left",
                                x: 0,
                                font: { family: FONT_MONO, size: 10, color: INK_MUTED },
                            },
                            xaxis: {
                                type: "date",
                                title: {
                                    text: "Date",
                                    font: { family: FONT_DISPLAY, size: 11, color: INK_MUTED },
                                },
                                tickfont: { family: FONT_MONO, size: 10, color: INK_MUTED },
                                // gridcolor: RULE,
                                gridcolor: "transparent",
                                zerolinecolor: RULE_STRONG,
                            },
                            yaxis: {
                                title: {
                                    text: metric.label,
                                    font: { family: FONT_DISPLAY, size: 11, color: INK_MUTED },
                                },
                                tickfont: { family: FONT_MONO, size: 10, color: INK_MUTED },
                                // gridcolor: RULE,
                                zerolinecolor: RULE_STRONG,
                            },
                            hoverlabel: {
                                bgcolor: "rgba(11, 12, 14, 0.94)",
                                bordercolor: "rgba(25, 83, 216, 0.72)",
                                align: "left",
                                namelength: -1,
                                font: { family: FONT_MONO, size: 11, color: "#fbf8f2" },
                            },
                        }}
                        config={{
                            displayModeBar: false,
                            scrollZoom: false,
                        }}
                        className="w-full h-full"
                    />
                ) : (
                    <div className="surface-empty">No daily stats available for this selection.</div>
                )}
            </div>

            {showOverlay && <StatusMessage loading={loading} error={error} onRefetch={onRefetch} />}
        </div>
    );
}

export default SurfaceLineChart;
