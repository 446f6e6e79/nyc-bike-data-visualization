/* Define constants for the map */
export const MAP_STYLES = {
  light: 'https://a.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}.png',
  dark: 'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
}

// Initial view state centered on NYC
export const INITIAL_VIEW_STATE = {
  longitude: -73.97,
  latitude: 40.75,
  zoom: 10.8,       // Initial zoom level to show the city
  pitch: 45,        // Map inclination for a 3D effect
  bearing: 0,       // Rotation of the map
}

// Limit the number of stations to fetch for performance reasons
export const LIMIT_STATIONS = 3000
export const LIMIT_TRIPS = 1000

// List of available map layers
export const LAYER_OPTIONS = [
    { value: 'station_usage', hasAnimation: true, label: 'Station usage' },
    // Future layers can be added here
]

// Allowed zoom range for map interactions
export const MIN_ZOOM = 9
export const MAX_ZOOM = 15
/** Utility function to clamp a value between a minimum and maximum */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const HOURS_IN_DAY = 24
export const BASE_FRAME_MS = 1000      // Duration of an hour in milliseconds at normal speed (1x)
export const MIN_PITCH = 0            // Minimum pitch angle for the map view
export const MAX_PITCH = 60           // Maximum pitch angle for the map view (to prevent excessive tilting)
export const SPEED_OPTIONS = [        // Options for animation speed control
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
]
