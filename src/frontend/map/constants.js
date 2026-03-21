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
  pitch: 20,        // Map inclination for a 3D effect
  bearing: 0,       // Rotation of the map
}

// Limit the number of stations to fetch for performance reasons
export const LIMIT_STATIONS = 3000

// Allowed zoom range for map interactions
export const MIN_ZOOM = 9
export const MAX_ZOOM = 15
