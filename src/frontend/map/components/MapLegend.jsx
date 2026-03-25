
export default function MapLegend({ activeLayer, frameStations, avgUsage }) {
    return (
        <div className="map-legend">
            <p className="map-legend-title">
                {activeLayer === 'frequent_trips' ? 'Frequent trips (hourly)' : 'Station usage (hourly)'}
            </p>
            (
            <>
                <p className="map-legend-text">Stations: {frameStations.length}</p>
                <p className="map-legend-text">Average: {avgUsage} rides</p>
                <div className="map-legend-scale" aria-hidden>
                    <span className="map-dot map-dot-low" />
                    <span className="map-dot map-dot-mid" />
                    <span className="map-dot map-dot-high" />
                </div>
            </>
            )
        </div>
    )
}            
                
