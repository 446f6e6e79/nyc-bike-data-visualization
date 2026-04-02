import { describe, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createQueryWrapper } from './testQueryClient.jsx'

import AppHeader from '../features/header/AppHeader.jsx'
import MapPage from '../features/map/MapPage.jsx'
import SurfacePage from '../features/temporal/TemporalPage.jsx'
import WeatherPage from '../features/weather/WeatherPage.jsx'
import App from '../App.jsx'

// Stub axios via apiClient — all hooks use apiClient.get()
vi.mock('../api-data/apiClient', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: {} }),
        interceptors: { request: { use: vi.fn() } },
    },
}))

// Wrapper to provide React Query context for components that use it
const wrapper = createQueryWrapper()

// These tests primarily check that components render without throwing
describe('components smoke tests', () => {
    it('AppHeader renders without crashing', () => {
        render(<MemoryRouter><AppHeader /></MemoryRouter>)
    })

    it('App renders without crashing', () => {
        render(<App />, { wrapper })
    })

    it('MapPage renders without crashing', () => {
        render(<MemoryRouter><MapPage /></MemoryRouter>, { wrapper })
    })

    it('SurfacePage renders without crashing', () => {
        render(<MemoryRouter><SurfacePage /></MemoryRouter>, { wrapper })
    })

    it('WeatherPage renders without crashing', () => {
        render(<MemoryRouter><WeatherPage /></MemoryRouter>, { wrapper })
    })
})