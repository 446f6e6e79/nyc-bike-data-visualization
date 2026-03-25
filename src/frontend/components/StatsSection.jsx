import StatCard from './StatCard.jsx'

function formatValue(value, formatter) {
    if (value === null || value === undefined) {
        return undefined
    }

    if (!formatter) {
        return value
    }

    return formatter(value)
}

function StatsSection({ title, items, itemKey, itemTitle, metrics, className = '' }) {
    return (
        <section className={className}>
            <h2 className="section-title">{title}</h2>
            <div className="section-grid">
                {items.map(item => (
                    <div key={item[itemKey]} className="stats-panel">
                        <h3 className="panel-title">{itemTitle(item)}</h3>
                        <div className="panel-cards">
                            {metrics.map(metric => (
                                <StatCard
                                    key={metric.label}
                                    label={metric.label}
                                    value={formatValue(item[metric.key], metric.formatter)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

export default StatsSection