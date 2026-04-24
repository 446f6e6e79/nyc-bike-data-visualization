export const HOURS_IN_DAY = 24;
export const BASE_FRAME_MS = 1000;
export const MINUTES_IN_HOUR = 60;
export const MINUTES_IN_DAY = HOURS_IN_DAY * MINUTES_IN_HOUR;
export const MAX_MINUTE_INDEX = MINUTES_IN_DAY - 1;
export const TIME_DRAG_THRESHOLD_PX = 4;
export const SPEED_DRAG_THRESHOLD_PX = 4;
export const MIN_SPEED = 0.5;
export const MAX_SPEED = 4;
export const SPEED_PIVOT = 2;

/**
 * Clamps a numeric value into the inclusive [min, max] range.
 * @param {number} value - Value to clamp.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @returns {number} Clamped value.
 */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Maps a playback speed (in [MIN_SPEED, MAX_SPEED]) to a 0–100 non-linear
 * percentage position on the speed wheel: linear on [MIN_SPEED, SPEED_PIVOT],
 * log2 on [SPEED_PIVOT, MAX_SPEED].
 * @param {number} value - Speed value in multiplier units.
 * @returns {number} Position percentage in [0, 100].
 */
export const speedToNonLinearPosition = (value) => {
    const clampedValue = clamp(value, MIN_SPEED, MAX_SPEED);

    if (clampedValue <= SPEED_PIVOT) {
        return ((clampedValue - MIN_SPEED) / (SPEED_PIVOT - MIN_SPEED)) * 50;
    }

    const rightRatio = Math.log2(clampedValue / SPEED_PIVOT) / Math.log2(MAX_SPEED / SPEED_PIVOT);
    return 50 + rightRatio * 50;
};

/**
 * Inverse of `speedToNonLinearPosition` — takes a wheel ratio in [0, 1] and
 * returns the corresponding speed multiplier.
 * @param {number} ratio - Position ratio in [0, 1].
 * @returns {number} Speed multiplier in [MIN_SPEED, MAX_SPEED].
 */
export const nonLinearPositionToSpeed = (ratio) => {
    const clampedRatio = clamp(ratio, 0, 1);

    if (clampedRatio <= 0.5) {
        return MIN_SPEED + (clampedRatio / 0.5) * (SPEED_PIVOT - MIN_SPEED);
    }

    const rightRatio = (clampedRatio - 0.5) / 0.5;
    return SPEED_PIVOT * 2 ** (rightRatio * Math.log2(MAX_SPEED / SPEED_PIVOT));
};

/**
 * Normalizes a time value to [0, HOURS_IN_DAY), wrapping negative or large
 * values back into the valid day range.
 * @param {number} time - Time in hours (may be fractional).
 * @returns {number} Normalized time in [0, HOURS_IN_DAY).
 */
export const normalizeTime = (time) => ((time % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY;

/**
 * Formats a fractional-hour time as a HH:MM string.
 * @param {number} time - Time in hours (may be fractional).
 * @returns {string} Zero-padded HH:MM label.
 */
export const formatTimeLabel = (time) => {
    const normalizedTime = normalizeTime(time);
    const totalMinutes = Math.floor(normalizedTime * MINUTES_IN_HOUR);
    const hours = Math.floor(totalMinutes / MINUTES_IN_HOUR);
    const minutes = totalMinutes % MINUTES_IN_HOUR;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

/**
 * Formats a playback speed multiplier as a compact label (e.g. "2×", "1.5×").
 * @param {number} value - Speed multiplier.
 * @returns {string} Display string with trailing "×".
 */
export const formatSpeedLabel = (value) => {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}×` : `${rounded.toFixed(1)}×`;
};

/**
 * Produces the hour tick marks (0..24 inclusive) with precomputed positions
 * for the time wheel, so the component does not recompute on every render.
 * @returns {Array<{hour:number,label:string,position:number}>} Hour marks with percentage positions.
 */
export const createHourMarks = () =>
    Array.from({ length: HOURS_IN_DAY + 1 }, (_, hour) => ({
        hour,
        label: String(hour).padStart(2, "0"),
        position: hour === HOURS_IN_DAY ? 100 : ((hour * MINUTES_IN_HOUR) / MAX_MINUTE_INDEX) * 100,
    }));
