import { ACCENT } from './editorialTokens.js'

/**
 * Join a list of class names together, silently dropping any falsy entries,
 * so callers can conditionally include modifier classes without template-literal noise.
 */
export const cx = (...classes: (string | false | null | undefined)[]) =>
    classes.filter(Boolean).join(' ')

// Bar chart colours
export const BAR_SOLID = ACCENT
export const BAR_MUTED = 'rgba(25, 83, 216, 0.18)'

// Scatter plot point styling
export const SCATTER_BORDER_COLOR = 'rgba(11, 12, 14, 0.4)'
export const SCATTER_BORDER_WIDTH = 1
export const SCATTER_POINT_RADIUS = 10
