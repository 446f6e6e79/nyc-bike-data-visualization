//#TODO: Check codes
// World Meteorological Organization (WMO) weather codes and their descriptions
export const WMO_WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}   
//#TODO: Revise grouping
/**
 * Groups weather codes into broader categories, assigning a label and color to each group
 */
export const GROUPED_WEATHER_CODES = {
  Clear:        [[0, 1], "#d59b2a"],                       // warm sun
  Cloudy:       [[2, 3], "#8b95a5"],                       // muted slate
  Foggy:        [[45, 48], "#c0bfb9"],                     // pale neutral
  Drizzle:      [[51, 53, 55, 56, 57], "#6aaad8"],         // light blue
  Rain:         [[61, 63, 65, 66, 67], "#1953d8"],         // accent — primary rain
  Snow:         [[71, 73, 75, 77, 85, 86], "#e6edfc"],     // paper-light (dark border in chart)
  Showers:      [[80, 81, 82], "#0a2a7a"],                 // accent-ink — heavy rain
  Thunderstorm: [[95, 96, 99], "#a32d2d"]                  // error — danger
}

/**
 * Determines the weather group for a given WMO weather code by checking which group contains the code
 * @param {number} code - The WMO weather code to classify into a group
 * @returns {string} The label of the weather group that the code belongs to, or "Other" if it doesn't match any group
*/
export function getWeatherGroup(code) {
    for (const [group, [codes]] of Object.entries(GROUPED_WEATHER_CODES)) {
        if (codes.includes(code)) return group
    }
}