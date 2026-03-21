import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import AppHeader from './components/AppHeader.jsx'
import StatsPage from './pages/StatsPage.jsx'
import MapPage from './pages/MapPage.jsx'

import useStatsData from './hooks/useStatsData.js'
import useDailyStats from './hooks/useDailyStats.js'

function App() {
  // Loading one time queries for stats data and daily stats, then passing down as props to StatsPage
  const statsData = useStatsData()
  const dailyData = useDailyStats()

  return (
    <BrowserRouter>
      <div className="app-shell">
        <AppHeader />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Navigate to="/map" replace />} />
            <Route path="/map"   element={<MapPage />} />
            <Route path="/stats" element={<StatsPage statsData={statsData} dailyData={dailyData} />} />
            {/* add future pages here */}
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App