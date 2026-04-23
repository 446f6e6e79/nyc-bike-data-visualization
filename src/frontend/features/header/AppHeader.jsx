import { useCallback, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useIsFetching } from "@tanstack/react-query";
import DateRangeFilter from "./components/DateRangeFilter.jsx";
import useHeaderFilters from "./hooks/useHeaderFilters.js";
import RiderBikeFilter from "./components/RiderBikeFilter.jsx";
import { useDatasetDateRange } from "./hooks/useDatasetDateRange.js";

const PAGES = [
    { to: "/map", label: "Map", icon: "fa-solid fa-map-location-dot" },
    { to: "/temporal", label: "Temporal", icon: "fa-solid fa-clock" },
    { to: "/weather", label: "Weather", icon: "fa-solid fa-cloud-sun" },
];

function useSafeIsFetching() {
    try {
        return useIsFetching({
            predicate: (query) => query.queryKey?.[0] !== "dataset-date-range",
        });
    } catch (hookError) {
        if (!String(hookError?.message).includes("No QueryClient set"))
            throw hookError;
        return 0;
    }
}

/**
 * Header component for the application, containing the title, navigation links, and the date range filter.
 * @returns
 */
function AppHeader({ onFiltersChange, forceDisableFilters = false }) {
    const location = useLocation();
    const isTemporalRoute = location.pathname === "/temporal";
    const {
        dateRange,
        currentUserFilters,
        handleDateRangeCommit,
        handleUserFilterChange,
    } = useHeaderFilters(onFiltersChange);
    const activeDataFetches = useSafeIsFetching();
    const areDateFiltersDisabled = activeDataFetches > 0;
    const areUserFiltersDisabled = activeDataFetches > 0 || forceDisableFilters;
    const shouldShowLockHint = isTemporalRoute && forceDisableFilters;
    const [isLockHintVisible, setIsLockHintVisible] = useState(false);
    const [lockHintPosition, setLockHintPosition] = useState({ x: 0, y: 0 });
    const lockHintRef = useRef(null);
    const { dateRange: datasetRange } = useDatasetDateRange();
    const kicker =
        datasetRange?.min_date && datasetRange?.max_date
            ? `NYC / ${datasetRange.min_date.slice(0, 4)}–${datasetRange.max_date.slice(0, 4)}`
            : "NYC";

    const updateLockHintPosition = useCallback(
        (event) => {
            if (!shouldShowLockHint) return;

            const VIEWPORT_MARGIN = 12;
            const NORTH_OFFSET_Y = 14;
            const hintWidth = lockHintRef.current?.offsetWidth ?? 340;
            const hintHeight = lockHintRef.current?.offsetHeight ?? 70;

            const anchorX = event.clientX;
            const anchorY = event.clientY + NORTH_OFFSET_Y;

            const rawLeft = anchorX - hintWidth / 2;
            const rawTop = anchorY;

            const maxLeft = Math.max(
                VIEWPORT_MARGIN,
                window.innerWidth - hintWidth - VIEWPORT_MARGIN,
            );
            const maxTop = Math.max(
                VIEWPORT_MARGIN,
                window.innerHeight - hintHeight - VIEWPORT_MARGIN,
            );

            const nextX = Math.min(Math.max(VIEWPORT_MARGIN, rawLeft), maxLeft);
            const nextY = Math.min(Math.max(VIEWPORT_MARGIN, rawTop), maxTop);

            setLockHintPosition({
                x: nextX,
                y: nextY,
            });
            setIsLockHintVisible(true);
        },
        [shouldShowLockHint],
    );

    const hideLockHint = useCallback(() => {
        setIsLockHintVisible(false);
    }, []);

    return (
        <header className="app-header">
            <div className="app-header__topbar">
                <div className="app-header__brand">
                    <span className="app-header__kicker">{kicker}</span>
                    <h1 className="app-title">
                        Citi Bike,{" "}
                        <span className="app-title__in-motion">
                            <span>i</span>
                            <span>n</span>
                            <span>&nbsp;</span>
                            <span>m</span>
                            <span>o</span>
                            <span>t</span>
                            <span>i</span>
                            <span>o</span>
                            <span>n</span>
                            <span>.</span>
                        </span>
                    </h1>
                </div>
                <nav className="app-header__nav">
                    {PAGES.map(({ to, label, icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                isActive ? "nav-link active" : "nav-link"
                            }
                        >
                            <span className="nav-link__icon" aria-hidden="true">
                                <i className={icon} />
                            </span>
                            {label}
                        </NavLink>
                    ))}
                </nav>
            </div>
            <div className="app-header__filters">
                <DateRangeFilter
                    value={dateRange}
                    onCommit={handleDateRangeCommit}
                    disabled={areDateFiltersDisabled}
                />
                <div
                    className={`app-header__filter-lockzone${shouldShowLockHint ? " is-locked" : ""}`}
                    onMouseEnter={updateLockHintPosition}
                    onMouseMove={updateLockHintPosition}
                    onMouseLeave={hideLockHint}
                >
                    <RiderBikeFilter
                        value={currentUserFilters}
                        onChange={handleUserFilterChange}
                        disabled={areUserFiltersDisabled}
                    />
                    {shouldShowLockHint && (
                        <p
                            ref={lockHintRef}
                            className={`app-header__filter-lock-hint${isLockHintVisible ? " is-visible" : ""}`}
                            role="note"
                            aria-live="polite"
                            style={{
                                "--filter-lock-hint-x": `${lockHintPosition.x}px`,
                                "--filter-lock-hint-y": `${lockHintPosition.y}px`,
                            }}
                        >
                            Class filters are locked while comparison surfaces
                            are active. Remove all surfaces or press Reset to
                            unlock them.
                        </p>
                    )}
                </div>
            </div>
        </header>
    );
}

export default AppHeader;
