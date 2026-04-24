/**
 * Renders a single legend row: swatch + label + optional hint.
 * @param {string} swatch - CSS color/gradient used for the legend swatch background.
 * @param {string} label - Human-readable label for the legend entry.
 * @param {string} [hint] - Optional secondary hint text shown alongside the label.
 * @returns {JSX.Element} List item representing one legend entry.
 */
export default function LegendRow({ swatch, label, hint }) {
    return (
        <li className="map-legend__row">
            <span className="map-legend__swatch" style={{ background: swatch }} />
            <span className="map-legend__label">{label}</span>
            {hint && <span className="map-legend__hint">{hint}</span>}
        </li>
    );
}
