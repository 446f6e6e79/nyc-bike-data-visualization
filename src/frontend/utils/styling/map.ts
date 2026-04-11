// Diverging editorial ramp for station usage, anchored at mean:
// rust (far below) → paper rail (at mean) → accent ink (far above).
export const STATION_USAGE_COLOR_RANGE: [number, number, number][] = [
    [194,  80,  26],  // deep rust  — far below mean
    [217, 128,  82],  // rust       — below mean
    [236, 230, 218],  // paper rail — at mean
    [184, 201, 236],  // accent soft
    [ 99, 135, 229],  // accent mid
    [ 25,  83, 216],  // accent
    [ 10,  42, 122],  // accent ink — far above mean
]
