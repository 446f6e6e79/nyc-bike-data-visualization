import { useEffect, useState } from "react";

import useDayHourStats from "../hooks/useDayHourStats";
import SurfaceSelector from "../components/SurfaceSelector";
import StatusMessage from "../components/StatusMessage";
import SurfaceGraph from "../components/SurfaceGraph";
import SurfaceHistograms from "../components/SurfaceHistograms";

export const SURFACE_METRICS = [
  { key: 'total_rides', label: 'Total Rides', fmt: v => v.toLocaleString() },
  { key: 'total_duration_minutes', label: 'Total Duration (min)', fmt: v => Math.round(v) + ' min' },
  { key: 'average_duration_minutes', label: 'Avg Duration (min)', fmt: v => v.toFixed(1) + ' min' },
  { key: 'total_distance', label: 'Total Distance (km)', fmt: v => v.toFixed(1) + ' km' },
  { key: 'average_distance', label: 'Avg Distance (km)', fmt: v => v.toFixed(2) + ' km' },
]

function SurfacePage({filters}) {
    const [activeMetric, setActiveMetric] = useState('total_rides')
    const { dayHourStats, loading, error } = useDayHourStats( filters )

    if (loading || error) {
        return <StatusMessage loading={loading} error={error} />
    }

    return (
        <>
        <SurfaceSelector activeMetric={activeMetric} setActiveMetric={setActiveMetric} />
              <SurfaceGraph
        data={dayHourStats}
        metric={activeMetric}
      />
        <SurfaceHistograms data={dayHourStats} activeMetric={activeMetric} />
        </>
    );
}

export default SurfacePage;