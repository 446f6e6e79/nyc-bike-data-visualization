import { useCallback, useEffect, useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import useStationRideCounts from '../hooks/useStationRideCounts.js'
import useTripsBetweenStations from '../hooks/useTripsBetweenStations.js'
import { INITIAL_VIEW_STATE, LIMIT_STATIONS, LIMIT_TRIPS, MAP_STYLES, MAX_ZOOM, MIN_ZOOM, clamp, HOURS_IN_DAY, BASE_FRAME_MS, MIN_PITCH, MAX_PITCH, SPEED_OPTIONS } from '../map/constants.js'
import { buildLayers } from '../map/buildLayers.js'
import { getAverageUsage, getStationsForHour, getTripsForHour, selectFrequentTrips, selectStations } from '../map/selectors.js'

function MapPage({ dateRange }) {
  // State for map view (center, zoom, etc.)
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)        // Default view state for NYC, can be adjusted as needed
  const [currentHour, setCurrentHour] = useState(7)                     // Current hour frame (0-23) for animation. Default to 7 AM     
  const [isPlaying, setIsPlaying] = useState(false)                     // Whether the hourly animation is playing or paused
  const [speed, setSpeed] = useState(1)                                 // Animation speed multiplier (1x, 2x, etc.). Default to 1x
  const [activeLayer, setActiveLayer] = useState('station_usage')       // Active layer to display
  
  // Build filters for station usage data
  const stationFilters = useMemo(
    () => ({ limit: LIMIT_STATIONS, 
             group_by: 'hour',
            ...(dateRange ?? {}) }),
    [dateRange] // Force refresh on new date range
  )
  const tripsFilters = useMemo(
    () => ({ limit: LIMIT_TRIPS,
             ...(dateRange ?? {}) }),
    [dateRange] // Force refresh on new date range
  )
  
  const { stationRideCounts,
          loading: stationLoading,
          error: stationError
  } = useStationRideCounts(stationFilters)
  const {
    tripsBetweenStations,
    loading: tripsLoading,
    error: tripsError,
  } = useTripsBetweenStations(tripsFilters)


  const stations = useMemo(() => selectStations(stationRideCounts), [stationRideCounts])
  const trips = useMemo(() => selectFrequentTrips(tripsBetweenStations), [tripsBetweenStations])
  const frameStations = useMemo(() => getStationsForHour(stations, currentHour), [stations, currentHour])
  const frameTrips = useMemo(() => getTripsForHour(trips, currentHour), [trips, currentHour])
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
  const maxTripUsage = useMemo(() => {
    if (!Array.isArray(trips) || trips.length === 0) {
      return 0
    }

    return trips.reduce((globalMax, trip) => {
      const tripMax = Array.isArray(trip.hourlyRidesByHour)
        ? Math.max(...trip.hourlyRidesByHour.map((usage) => Number(usage) || 0))
        : 0

      return Math.max(globalMax, tripMax)
    }, 0)
  }, [trips])
  const avgUsage = useMemo(() => getAverageUsage(frameStations), [frameStations])
  const activeFrameCount = activeLayer === 'frequent_trips' ? frameTrips.length : frameStations.length
  const hourLabel = `${String(currentHour).padStart(2, '0')}:00`

  useEffect(() => {
    if (!isPlaying || stationLoading || tripsLoading || activeFrameCount === 0) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setCurrentHour((hour) => (hour + 1) % HOURS_IN_DAY)
    }, BASE_FRAME_MS / speed)

    return () => window.clearInterval(intervalId)
  }, [isPlaying, stationLoading, tripsLoading, activeFrameCount, speed])

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
        trips: frameTrips,
        maxTripUsage,
        activeLayer,
        tileUrl: MAP_STYLES.light,
      }),
    [frameStations, maxUsage, frameTrips, maxTripUsage, activeLayer]
  )

  if (stationError || tripsError) {
    return <div className="map-error">Failed to load map data: {stationError ?? tripsError}</div>
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

          if (Array.isArray(object.sourcePosition) && Array.isArray(object.targetPosition)) {
            const rides = Math.round(Number(object.hourly_rides) || 0)
            const fromName = object.stationAName ?? 'Station A'
            const toName = object.stationBName ?? 'Station B'

            return `Hour: ${hourLabel}\nTrip: ${fromName} → ${toName}\nRides: ${rides}`
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
      {!stationLoading && !tripsLoading && activeFrameCount > 0 && (
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
          <label className="map-controls-label" htmlFor="map-layer-select">
            Layer
          </label>
          <select
            id="map-layer-select"
            className="map-controls-select"
            value={activeLayer}
            onChange={(event) => setActiveLayer(event.target.value)}
          >
            <option value="station_usage">Station usage</option>
            <option value="frequent_trips">Frequent trips</option>
          </select>
          <p className="map-controls-hour">Hour: {hourLabel}</p>
          <p className="map-controls-hint">Shift + drag to rotate</p>
        </div>
      )}
      {!stationLoading && !tripsLoading && activeFrameCount > 0 && (
        <div className="map-legend">
          <p className="map-legend-title">
            {activeLayer === 'frequent_trips' ? 'Frequent trips (hourly)' : 'Station usage (hourly)'}
          </p>
          {activeLayer === 'frequent_trips' ? (
            <>
              <p className="map-legend-text">Trip arcs: {frameTrips.length}</p>
              <p className="map-legend-text">Top routes for {hourLabel}</p>
            </>
          ) : (
            <>
              <p className="map-legend-text">Stations: {frameStations.length}</p>
              <p className="map-legend-text">Average: {avgUsage} rides</p>
              <div className="map-legend-scale" aria-hidden>
                <span className="map-dot map-dot-low" />
                <span className="map-dot map-dot-mid" />
                <span className="map-dot map-dot-high" />
              </div>
            </>
          )}
        </div>
      )}
      {(stationLoading || tripsLoading) && <div className="map-overlay">Loading map data…</div>}
    </div>
  )
}

export default MapPage