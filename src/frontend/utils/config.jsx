// Maximum number of months to display the desired date range
export const MAX_COVERED_MONTHS = 6
// Labels for visualization
export const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}:00`)
export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const normalizeDay = d => (d === 0 ? 6 : d - 1)
// Limit the number of stations to fetch for performance reasons
export const LIMIT_STATIONS = 3000
export const LIMIT_TRIPS = 10 // Limit per station
