import React from 'react'

const API = 'http://localhost:8000'

const StatCard = ({ label, value }) => (
  <div style={{
    background: 'white', borderRadius: '8px', padding: '20px 28px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: '180px', textAlign: 'center',
  }}>
    <p style={{ margin: 0, color: '#888', fontSize: '0.85rem' }}>{label}</p>
    <p style={{ margin: '8px 0 0', color: '#222', fontSize: '1.6rem', fontWeight: 700 }}>{value ?? '—'}</p>
  </div>
)

function App() {
  const [rideStats, setRideStats] = React.useState([])
  const [userStats, setUserStats] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    const fetchAll = async () => {
      try {
        const [classic, electric, member, casual] = await Promise.all([
          fetch(`${API}/statistics/ride-types/classic_bike`).then(r => r.json()),
          fetch(`${API}/statistics/ride-types/electric_bike`).then(r => r.json()),
          fetch(`${API}/statistics/user-types/member`).then(r => r.json()),
          fetch(`${API}/statistics/user-types/casual`).then(r => r.json()),
        ])
        setRideStats([classic, electric])
        setUserStats([member, casual])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a73e8, #0d47a1)',
        color: 'white', padding: '40px', textAlign: 'center',
      }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>🚲 Citi Bike Analytics</h1>
        <p style={{ margin: '10px 0 0', opacity: 0.85 }}>Live statistics from the backend API</p>
      </div>

      <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
        {loading && <p style={{ textAlign: 'center', color: '#666' }}>Loading data from API...</p>}
        {error && <p style={{ textAlign: 'center', color: 'red' }}>Error: {error}</p>}

        {!loading && !error && (
          <>
            <h2 style={{ color: '#333', marginBottom: '16px' }}>By Rideable Type</h2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '40px' }}>
              {rideStats.map(s => (
                <div key={s.rideable_type} style={{
                  background: 'white', borderRadius: '10px', padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flex: '1', minWidth: '260px',
                }}>
                  <h3 style={{ margin: '0 0 16px', color: '#1a73e8', textTransform: 'capitalize' }}>
                    {s.rideable_type.replace('_', ' ')}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <StatCard label="Total Rides" value={s.total_rides.toLocaleString()} />
                    <StatCard label="Avg Duration (min)" value={s.average_duration_minutes.toFixed(1)} />
                    <StatCard label="Total Distance (km)" value={s.total_distance_km.toFixed(0)} />
                  </div>
                </div>
              ))}
            </div>

            <h2 style={{ color: '#333', marginBottom: '16px' }}>By User Type</h2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {userStats.map(s => (
                <div key={s.user_type} style={{
                  background: 'white', borderRadius: '10px', padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flex: '1', minWidth: '260px',
                }}>
                  <h3 style={{ margin: '0 0 16px', color: '#1a73e8', textTransform: 'capitalize' }}>
                    {s.user_type}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <StatCard label="Total Rides" value={s.total_rides.toLocaleString()} />
                    <StatCard label="Avg Duration (min)" value={s.average_duration_minutes.toFixed(1)} />
                    <StatCard label="Avg Distance (km)" value={s.average_distance_km.toFixed(2)} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App