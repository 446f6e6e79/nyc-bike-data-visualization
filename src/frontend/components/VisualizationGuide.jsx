import { useState } from 'react'

function VisualizationGuide({ title, summary, hints = [], mapName }) {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <section className={`viz-guide${collapsed ? ' is-collapsed' : ''}`} aria-label="Visualization guide">
            <div className="viz-guide__top-row">
                <div className="viz-guide__header">
                    <span className="viz-guide__eyebrow">Guide</span>
                    <h3 className="viz-guide__title">
                        {mapName && <span className="viz-guide__title-map-name">{mapName}</span>}
                        <span>{title}</span>
                    </h3>
                </div>

                <button
                    type="button"
                    className="viz-guide__toggle-btn"
                    onClick={() => setCollapsed((prev) => !prev)}
                    aria-expanded={!collapsed}
                >
                    {collapsed ? 'Show' : 'Hide'}
                </button>
            </div>

            <div className={`viz-guide__content${collapsed ? ' is-collapsed' : ''}`} aria-hidden={collapsed}>
                <p className="viz-guide__summary">{summary}</p>

                <div className="viz-guide__hints">
                    {hints.map((hint, index) => (
                        <article key={hint.title} className="viz-guide__hint-card">
                            <span className="viz-guide__hint-index">Hint {index + 1}</span>
                            <p className="viz-guide__hint-title">{hint.title}</p>
                            <p className="viz-guide__hint-text">{hint.text}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default VisualizationGuide