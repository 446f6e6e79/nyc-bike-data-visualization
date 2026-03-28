import '@testing-library/jest-dom'

// Need to avoid build errors from Plotly's mapbox module
window.URL.createObjectURL = vi.fn()
