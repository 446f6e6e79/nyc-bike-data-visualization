import { useCallback, useMemo, useState } from 'react'


/**
 * Custom hook to manage the selection state of stations in the trip flow layer. It provides a callback function to toggle station selection and a list of currently selected station IDs.
 * @returns 
 */
export function useTripStationSelection() {
    // Store selected station keys in a Set for efficient add/remove operations
    const [selectedStationIdSet, setSelectedStationIdSet] = useState(() => new Set())
    // Callback function to handle station selection when a station is picked on the map. It toggles the selection state of the station based on its ID.
    const onStationPick = useCallback((info) => {
        const stationKey = info?.object?.id
        if (!stationKey) return
        // Toggle station selection behaviour
        setSelectedStationIdSet((previousSet) => {
            if (previousSet.has(stationKey)) {
                // If the station is already selected, create a new Set without the station to deselect it
                return new Set([...previousSet].filter((selectedStationId) => selectedStationId !== stationKey))
            }
            // If the station is not selected, create a new Set with the station added to select it
            return new Set(previousSet).add(stationKey)
        })
    }, [])
    // Convert the Set of selected station keys to an array for easier use in components
    const selectedStationIds = useMemo(() => Array.from(selectedStationIdSet), [selectedStationIdSet])
    // Function to reset the selection of stations by clearing the Set of selected station keys
    const resetSelectedStationIds = useCallback(() => {
        setSelectedStationIdSet(new Set())
    }, [])
    // Return the selected station IDs and the click handler for station selection
    return {
        resetSelectedStationIds,
        selectedStationIds,
        onStationPick,
    }
}
