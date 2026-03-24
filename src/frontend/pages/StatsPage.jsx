import StatsSection from '../components/StatsSection.jsx'
import DailyStatsBarChart from '../components/DailyStatsBarChart.jsx'
import StatusMessage from '../components/utils/StatusMessage.jsx'
import useStatsData from '../hooks/useStatsData.js'
import useDailyStats from '../hooks/useDailyStats.js'

// Formats and labels for the stats metrics to be displayed in the StatsSection components. 
const rideMetrics = [
  { label: 'Total Rides',         key: 'total_rides',              formatter: v => v.toLocaleString() },
  { label: 'Avg Duration (min)',  key: 'average_duration_minutes', formatter: v => v.toFixed(1) },
  { label: 'Total Distance (km)', key: 'total_distance_km',        formatter: v => v.toFixed(0) },
]

const userMetrics = [
  { label: 'Total Rides',        key: 'total_rides',              formatter: v => v.toLocaleString() },
  { label: 'Avg Duration (min)', key: 'average_duration_minutes', formatter: v => v.toFixed(1) },
  { label: 'Avg Distance (km)',  key: 'average_distance_km',      formatter: v => v.toFixed(2) },
]

const StatsPage = ( { dateRange } ) => {
  const { rideStats, userStats, loading, error } = useStatsData(dateRange)
  const { dailyStats, loading: dailyLoading, error: dailyError } = useDailyStats(dateRange)

  return (
    <>
      <StatusMessage loading={loading || dailyLoading} error={error || dailyError} />
      {!loading && !error && (
        <>
          <StatsSection
            className="ride-section"
            title="By Rideable Type"
            items={rideStats}
            itemKey="rideable_type"
            itemTitle={item => item.rideable_type.replace('_', ' ')}
            metrics={rideMetrics}
          />
          <StatsSection
            title="By User Type"
            items={userStats}
            itemKey="user_type"
            itemTitle={item => item.user_type}
            metrics={userMetrics}
          />
          <DailyStatsBarChart items={dailyStats} />
        </>
        
      )}
    </>
  )
}

export default StatsPage