function StatCard({ label, value }) {
    return (
        <div className="stat-card">
            <p className="stat-card-label">{label}</p>
            <p className="stat-card-value">{value ?? '—'}</p>
        </div>
    )
}

export default StatCard