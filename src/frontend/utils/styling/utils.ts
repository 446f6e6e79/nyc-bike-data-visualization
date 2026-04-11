/**
 * Join a list of class names together, silently dropping any falsy entries,
 * so callers can conditionally include modifier classes without template-literal noise.
 */
export const cx = (...classes: (string | false | null | undefined)[]) =>
    classes.filter(Boolean).join(' ')
