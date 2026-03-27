import { useMemo } from 'react'
import { selectStationAvailability } from '../selectors/stationAvailability.js'
import useStationAvailability from '../../hooks/useStationAvailability.js'

export function useStationAvailabilityLayer() {
  const { stationData, loading, error } = useStationAvailability()

  const stations = useMemo(() => selectStationAvailability(stationData), [stationData])

  return { stations, loading, error }
}