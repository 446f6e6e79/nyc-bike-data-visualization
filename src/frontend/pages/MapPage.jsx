import { useCallback, useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import useStationRideCounts from '../hooks/useStationRideCounts.js'
import { INITIAL_VIEW_STATE, LIMIT_STATIONS, MAP_STYLES, MAX_ZOOM, MIN_ZOOM } from '../map/constants.js'
import { buildLayers } from '../map/buildLayers.js'
import { getAverageUsage, getMaxUsage, selectStations } from '../map/selectors.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function MapPage() {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)
  const { stationRideCounts, loading, error } = useStationRideCounts({ limit: LIMIT_STATIONS })
  const stations = useMemo(() => selectStations(stationRideCounts), [stationRideCounts])
  const maxUsage = useMemo(() => getMaxUsage(stations), [stations])
  const avgUsage = useMemo(() => getAverageUsage(stations), [stations])

  const handleViewStateChange = useCallback(({ viewState: nextViewState }) => {
    setViewState({
      ...nextViewState,
      zoom: clamp(nextViewState.zoom, MIN_ZOOM, MAX_ZOOM),
    })
  }, [])

  const layers = useMemo(
    () =>
      buildLayers({
        stations,
        maxUsage,
        tileUrl: MAP_STYLES.light,
      }),
    [stations, maxUsage]
  )

  if (error) {
    return <div className="map-error">Failed to load map data: {error}</div>
  }

  return (
    <div className="map-shell">
      <DeckGL
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        controller={{ minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM }}
        layers={layers}
        getTooltip={({ object }) => {
          if (!object) {
            return null
          }

          const points = Array.isArray(object.points) ? object.points : []

          if (points.length > 0) {
            const totalUsage = Math.round(
              points.reduce((sum, point) => sum + (Number(point.usage) || 0), 0)
            )
            const uniqueStationIds = [...new Set(points.map((point) => point.stationId).filter(Boolean))]
            const stationPreview = uniqueStationIds.slice(0, 4).join(', ')
            const stationSuffix = uniqueStationIds.length > 4 ? ', …' : ''

            return `Stations: ${points.length}\nUsage: ${totalUsage} rides\nIDs: ${stationPreview}${stationSuffix}`
          }

          const totalUsage = Math.round(Number(object.elevationValue ?? object.colorValue ?? 0) || 0)
          const count = Math.round(Number(object.count ?? 0) || 0)

          return `Stations: ${count}\nUsage: ${totalUsage} rides`
        }}
      />
      {!loading && stations.length > 0 && (
        <div className="map-legend">
          <p className="map-legend-title">Station usage</p>
          <p className="map-legend-text">Stations: {stations.length}</p>
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