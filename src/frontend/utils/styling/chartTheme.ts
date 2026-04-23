import { Chart } from 'chart.js/auto'
import {
    INK,
    PAPER_RAISED,
    ACCENT,
    FONT_SANS,
    FONT_MONO,
} from '../editorialTokens.js'

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
    tooltip.backgroundColor = 'rgba(11, 12, 14, 0.94)'
    tooltip.titleColor = PAPER_RAISED
    tooltip.bodyColor = PAPER_RAISED
    tooltip.borderColor = 'rgba(25, 83, 216, 0.72)'
    tooltip.borderWidth = 1
    tooltip.cornerRadius = 2
    tooltip.padding = { top: 12, right: 14, bottom: 12, left: 14 }
    tooltip.displayColors = true
    tooltip.boxPadding = 5
    tooltip.bodySpacing = 4
    tooltip.titleMarginBottom = 7
    tooltip.caretPadding = 10
    tooltip.caretSize = 6
    tooltip.usePointStyle = true
    tooltip.titleFont = { family: FONT_MONO, size: 10 }
    tooltip.bodyFont = { family: FONT_MONO, size: 11 }
}
