import {
    INK,
    INK_MUTED,
    PAPER,
    PAPER_RAISED,
    ACCENT,
    ACCENT_INK,
    RULE,
    RULE_STRONG,
    FONT_DISPLAY,
    FONT_MONO,
} from '../editorialTokens.js'

// Sequential editorial ramp: paper (min) → accent-ink (max).
// Five stops map the full z range cleanly without muddying the midrange.
export const EDITORIAL_COLORSCALE = [
    [0.00, PAPER],
    [0.25, '#b8c9ec'],
    [0.50, '#6387e5'],
    [0.75, ACCENT],
    [1.00, ACCENT_INK],
]

// Shared axis factory — every axis uses the same typography and rule tones,
// so x/y/z stay visually parallel even when their labels differ.
export const editorialAxis = (title: string) => ({
    title: { text: title, font: { family: FONT_DISPLAY, color: INK, size: 14 } },
    tickfont: { family: FONT_MONO, color: INK_MUTED, size: 11 },
    gridcolor: RULE,
    backgroundcolor: PAPER_RAISED,
    showbackground: true,
    zerolinecolor: RULE_STRONG,
})
