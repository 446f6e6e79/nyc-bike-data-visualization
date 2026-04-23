// Diverging editorial ramp for station usage, anchored at mean:
// rust (far below) → paper rail (at mean) → accent ink (far above).
// Neutral must be at index 3 (center of 7) so deck.gl maps value=0 to grey.
export const STATION_USAGE_COLOR_RANGE: [number, number, number][] = [
    [120,  30,   5],  // deep rust  — far below mean
    [194,  80,  26],  // rust       — below mean
    [230, 155, 100],  // light rust — slightly below mean
    [236, 230, 218],  // paper rail — at mean
    [184, 201, 236],  // accent soft
    [ 99, 135, 229],  // accent mid
    [ 10,  42, 122],  // accent ink — far above mean
]
