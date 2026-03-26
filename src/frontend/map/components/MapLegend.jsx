import { LAYER_OPTIONS } from "../constants"

/**
 * Renders the map legend based on the currently active layer. 
 * @param {string} activeLayer - The currently active map layer to determine which legend to display. 
 * @returns The JSX for the map legend, which includes a title and specific legend content based on the active layer. The legend content is defined in separate functions for each layer type, allowing for easy extension in the future by adding new entries to the availableLegends object.
 */
export default function MapLegend({ activeLayer }) {
    // Get label of the active layer from the options
    const activeLayerLabel = LAYER_OPTIONS.find((layer) => layer.value === activeLayer)?.label || 'Unknown layer'
    // Define the available legends for each layer type, which can be easily extended in the future by adding new entries to this object.
    const availableLegends ={
        'station_usage': stationUsageLegend(),
        'trip_flow': tripFlowLegend(),
    }

    return (
        <div className="map-legend">
            {/* Display the title of the legend based on the active layer. */}
            <p className="map-legend-title">
                {activeLayerLabel}
            </p>
            {/* Render the legend content based on the active layer, using the pre-defined legend components for each layer type. */}
            <>
                {availableLegends[activeLayer]}
            </>
        </div>
    )
}    

//#TODO: enhance style of legends
function stationUsageLegend() {
    return (
        <div className="map-legend">
            <div className="map-legend-scale" aria-hidden>
                <span className="map-dot map-dot-low" />
                <span className="map-dot map-dot-mid" />
                <span className="map-dot map-dot-high" />
            </div>
        </div>
    )
}

function tripFlowLegend() {
    return (
        <div className="map-legend">
            <p className="map-legend-text">Frequent trips</p>
        </div>
    )
}
                
