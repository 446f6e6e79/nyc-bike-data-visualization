import { useEffect, useState } from "react";

import useDayHourStats from "../hooks/useDayHourStats";
import SurfaceSelector from "../components/SurfaceSelector";
import UserFilter from "../components/UserFilter";

export const SURFACE_METRICS = {
    total_rides: { label: 'Total Rides' },
    total_duration_minutes: { label: 'Total Duration (min)' },
    average_duration_minutes: { label: 'Avg Duration (min)' },
    total_distance: { label: 'Total Distance (km)' },
    average_distance: { label: 'Avg Distance (km)' },
}

function SurfacePage({dateRange}) {
    const [activeMetric, setActiveMetric] = useState('total_rides')
    const [currentUserFilters, setCurrentUserFilters] = useState({})

    const filters = { ...dateRange, ...currentUserFilters }

    const { dayHourStats, loading, error } = useDayHourStats({ ...filters })

    return (
        <>
        <SurfaceSelector activeMetric={activeMetric} setActiveMetric={setActiveMetric} />
        <UserFilter currentUserFilters={currentUserFilters} onUserFilterChange={setCurrentUserFilters} />
        <pre style={{ background: '#f0f0f0', padding: '1rem', fontSize: '12px' }}>
            {loading ? 'Loading...' : JSON.stringify(dayHourStats, null, 2)}
        </pre>
        </>
    );
}

export default SurfacePage;