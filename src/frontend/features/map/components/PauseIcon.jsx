/**
 * SVG pause icon used by the map speed controls play/pause button.
 * @returns {JSX.Element} Inline SVG rendered at the current text color.
 */
export default function PauseIcon() {
    return (
        <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
            <rect x="1" y="1" width="3" height="10" rx="0.5" />
            <rect x="6" y="1" width="3" height="10" rx="0.5" />
        </svg>
    );
}
