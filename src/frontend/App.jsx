import React from 'react'
import './App.css'
import AppHeader from './components/AppHeader.jsx'
import StatsSection from './components/StatsSection.jsx'
import StatusMessage from './components/StatusMessage.jsx'
import DailyStatsBarChart from './components/DailyStatsBarChart.jsx'
import useStatsData from './hooks/useStatsData.js'

function App() {
  const { rideStats, userStats, loading, error } = useStatsData()

  const rideMetrics = [
    { label: 'Total Rides', key: 'total_rides', formatter: value => value.toLocaleString() },
    { label: 'Avg Duration (min)', key: 'average_duration_minutes', formatter: value => value.toFixed(1) },
    { label: 'Total Distance (km)', key: 'total_distance_km', formatter: value => value.toFixed(0) },
  ]

  const userMetrics = [
    { label: 'Total Rides', key: 'total_rides', formatter: value => value.toLocaleString() },
    { label: 'Avg Duration (min)', key: 'average_duration_minutes', formatter: value => value.toFixed(1) },
    { label: 'Avg Distance (km)', key: 'average_distance_km', formatter: value => value.toFixed(2) },
  ]

  return (
    <div className="app-shell">
      <AppHeader />

      <div className="app-content">
        <StatusMessage loading={loading} error={error} />

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
            {/* TODO: Think about doing a new endpoint for daily stats, by now this charts needs to do 7 calls */}
            <DailyStatsBarChart items={[]} />
          </>
        )}
      </div>
    </div>
  )
}

export default App