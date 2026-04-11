import { Chart } from 'chart.js/auto'
import {
    INK,
    PAPER_RAISED,
    ACCENT,
    FONT_SANS,
    FONT_MONO,
} from './editorialTokens.js'

let applied = false

/**
 * Apply editorial defaults to Chart.js once at app startup. Every subsequent
 * `new Chart(...)` picks these up automatically, so per-chart config only
 * needs to override what is truly chart-specific.
 */
export function applyEditorialChartDefaults() {
    if (applied) return
    applied = true

    Chart.defaults.font.family = FONT_SANS
    Chart.defaults.font.size = 12
    Chart.defaults.color = INK

    const tooltip = Chart.defaults.plugins.tooltip
    tooltip.backgroundColor = INK
    tooltip.titleColor = PAPER_RAISED
    tooltip.bodyColor = PAPER_RAISED
    tooltip.borderColor = ACCENT
    tooltip.borderWidth = 1
    tooltip.cornerRadius = 0
    tooltip.padding = 12
    tooltip.displayColors = true
    tooltip.boxPadding = 6
    tooltip.titleFont = { family: FONT_MONO, size: 10, weight: '600' }
    tooltip.bodyFont = { family: FONT_MONO, size: 11 }
}
