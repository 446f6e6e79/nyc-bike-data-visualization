import { useCallback, useMemo, useState } from 'react'


/**
 * Custom hook to manage the selection state of stations in the trip flow layer. It provides a callback function to toggle station selection and a list of currently selected station IDs.
 * @returns 
 */
export function useTripStationSelection() {
    // Store selected station keys in a Set for efficient add/remove operations
    const [selectedStationIdSet, setSelectedStationIdSet] = useState(() => new Set())

    const onStationPick = useCallback((info) => {
        const stationKey = info?.object?.id
        if (!stationKey) return
        // Toggle station selection behaviour
        setSelectedStationIdSet((previousSet) => {
            const nextSet = new Set(previousSet)
            if (nextSet.has(stationKey)) {
                nextSet.delete(stationKey)
            } else {
                nextSet.add(stationKey)
            }
            return nextSet
        })
    }, [])
    // Convert the Set of selected station keys to an array for easier use in components
    const selectedStationIds = useMemo(() => Array.from(selectedStationIdSet), [selectedStationIdSet])
    // Return the selected station IDs and the click handler for station selection
    return {
        selectedStationIds,
        onStationPick,
    }
}
