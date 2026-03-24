import { useCallback, useEffect, useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import useStationRideCounts from '../hooks/useStationRideCounts.js'
import { INITIAL_VIEW_STATE, LIMIT_STATIONS, MAP_STYLES, MAX_ZOOM, MIN_ZOOM, clamp, HOURS_IN_DAY, BASE_FRAME_MS, MIN_PITCH, MAX_PITCH, SPEED_OPTIONS } from '../map/constants.js'
import { buildLayers } from '../map/buildLayers.js'
import { getAverageUsage, getStationsForHour, selectStations } from '../map/selectors.js'

function MapPage() {
  // State for map view (center, zoom, etc.)
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)
  const [currentHour, setCurrentHour] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  
  // States for map informations
  const { stationRideCounts, loading, error } = useStationRideCounts({ limit: LIMIT_STATIONS, group_by: 'hour' }) // Currently fetching hourly data, but can be adjusted to other time frames as needed
  const stations = useMemo(() => selectStations(stationRideCounts), [stationRideCounts])
  const frameStations = useMemo(() => getStationsForHour(stations, currentHour), [stations, currentHour])
  const maxUsage = useMemo(() => {
    if (!Array.isArray(stations) || stations.length === 0) {
      return 0
    }

    return stations.reduce((globalMax, station) => {
      const stationMax = Array.isArray(station.hourlyUsageByHour)
        ? Math.max(...station.hourlyUsageByHour.map((usage) => Number(usage) || 0))
        : 0

      return Math.max(globalMax, stationMax)
    }, 0)
  }, [stations])
  const avgUsage = useMemo(() => getAverageUsage(frameStations), [frameStations])
  const hourLabel = `${String(currentHour).padStart(2, '0')}:00`

  useEffect(() => {
    if (!isPlaying || loading || frameStations.length === 0) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setCurrentHour((hour) => (hour + 1) % HOURS_IN_DAY)
    }, BASE_FRAME_MS / speed)

    return () => window.clearInterval(intervalId)
  }, [isPlaying, loading, frameStations.length, speed])

  const handleViewStateChange = useCallback(({ viewState: nextViewState }) => {
    setViewState({
      ...nextViewState,
      zoom: clamp(nextViewState.zoom, MIN_ZOOM, MAX_ZOOM),
      pitch: clamp(nextViewState.pitch, MIN_PITCH, MAX_PITCH),
    })
  }, [])

  const layers = useMemo(
    () =>
      buildLayers({
        stations: frameStations,
        maxUsage,
        tileUrl: MAP_STYLES.light,
      }),
    [frameStations, maxUsage]
  )

  if (error) {
    return <div className="map-error">Failed to load map data: {error}</div>
  }

  return (
    <div className="map-shell">
      <DeckGL
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        controller={{
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          minPitch: MIN_PITCH,
          maxPitch: MAX_PITCH,
          dragRotate: true,
          touchRotate: true,
        }}
        layers={layers}
        getTooltip={({ object }) => {
          if (!object) {
            return null
          }

          const points = Array.isArray(object.points) ? object.points : []

          if (points.length > 0) {
            const totalUsage = Math.round(
              points.reduce((sum, point) => sum + (Number(point.hourly_usage) || 0), 0)
            )
            const uniqueStationIds = [...new Set(points.map((point) => point.stationId).filter(Boolean))]
            const stationPreview = uniqueStationIds.slice(0, 4).join(', ')
            const stationSuffix = uniqueStationIds.length > 4 ? ', …' : ''

            return `Hour: ${hourLabel}\nStations: ${points.length}\nUsage: ${totalUsage} rides\nIDs: ${stationPreview}${stationSuffix}`
          }

          const totalUsage = Math.round(Number(object.elevationValue ?? object.colorValue ?? 0) || 0)
          const count = Math.round(Number(object.count ?? 0) || 0)

          return `Hour: ${hourLabel}\nStations: ${count}\nUsage: ${totalUsage} rides`
        }}
      />
      {!loading && frameStations.length > 0 && (
        <div className="map-controls">
          <button
            type="button"
            className="map-controls-button"
            onClick={() => setIsPlaying((playing) => !playing)}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <label className="map-controls-label" htmlFor="map-speed-select">
            Speed
          </label>
          <select
            id="map-speed-select"
            className="map-controls-select"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value) || 1)}
          >
            {SPEED_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="map-controls-hour">Hour: {hourLabel}</p>
          <p className="map-controls-hint">Shift + drag to rotate</p>
        </div>
      )}
      {!loading && frameStations.length > 0 && (
        <div className="map-legend">
          <p className="map-legend-title">Station usage (hourly)</p>
          <p className="map-legend-text">Stations: {frameStations.length}</p>
          <p className="map-legend-text">Average: {avgUsage} rides</p>
          <div className="map-legend-scale" aria-hidden>
            <span className="map-dot map-dot-low" />
            <span className="map-dot map-dot-mid" />
            <span className="map-dot map-dot-high" />
          </div>
        </div>
      )}
      {loading && <div className="map-overlay">Loading station usage…</div>}
    </div>
  )
}

export default MapPage