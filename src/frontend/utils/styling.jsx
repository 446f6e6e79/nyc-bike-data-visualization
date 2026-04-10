/**
 * Join a list of class names together, silently dropping any falsy entries,
 * so callers can conditionally include modifier classes without template-literal noise.
 */
export const cx = (...classes) => classes.filter(Boolean).join(' ')