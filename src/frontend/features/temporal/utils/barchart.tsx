type TooltipContext = { parsed: { y: number } }

// Utility functions for formatting tooltip labels and Y-axis ticks in the temporal stats page's charts.
export function formatTooltipLabel(format: (value: number) => string, ctx: TooltipContext) {
    return " " + format(ctx.parsed.y)
}

// Function to format Y-axis tick values based on the unit of measurement. For "rides", it formats large numbers with suffixes (k for thousands, M for millions). For other units, it formats the number to one decimal place.
export function formatYAxisTick(unit: string, value: number) {
    if (unit === "rides") {
        if (value >= 1e6) return (value / 1e6).toFixed(1) + "M"
        if (value >= 1e3) return (value / 1e3).toFixed(0) + "k"
        return Math.round(value).toLocaleString()
    }

    if (unit === "rides/day") {
        if (value >= 1e6) return (value / 1e6).toFixed(1) + "M"
        if (value >= 1e3) return (value / 1e3).toFixed(1) + "k"
        return Number(value).toFixed(1)
    }

    return Number(value).toFixed(1)
}
