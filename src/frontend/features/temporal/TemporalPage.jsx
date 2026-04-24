import { useEffect, useMemo, useRef, useState } from "react";
import useTemporalState from "./hooks/useTemporalState";
import useCompareTemporalLayers from "./hooks/useCompareTemporalLayers.js";
import MetricSelector from "./components/MetricSelector";
import SurfaceGraph from "./components/SurfaceGraph";
import SurfaceHistograms from "./components/SurfaceHistograms";
import SurfaceLineChart from "./components/SurfaceLineChart.jsx";
import CompareFilterDropdown from "./components/CompareFilterDropdown.jsx";
import VisualizationGuide from "../../components/VisualizationGuide";
import { FILTERS } from "../header/components/RiderBikeFilter.jsx";
import {
    CLASS_FILTER_KEYS,
    COMPARE_LAYER_COLORS,
    COMPARE_LAYER_SCALES,
    buildLayerKey,
    buildLayerLabel,
    stripClassFilters,
} from "./utils/compare_layers.js";

/**
 * Component for the temporal stats page, which includes a metric selector, the surface graph itself, and accompanying histograms.
 * @param {Object} filters - The filters to apply to the data.
 * @returns The rendered TemporalPage component, which displays the surface graph and histograms based on the selected metric and applied filters.
 */
function TemporalPage({ filters, onCompareModeChange }) {
    // Use the custom hook to manage the temporal state, including the active metric, hovered coordinates, and fetched data for the surface graph and histograms. The hook also provides loading and error states to handle the data fetching process.
    const {
        activeMetric,
        setActiveMetric,
        coordinates,
        setCoordinates,
        dayHourStats,
        dayStats,
        hourStats,
        dateStats,
        loading,
        error,
        refetch,
    } = useTemporalState(filters);
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [isCompareHovered, setIsCompareHovered] = useState(false);
    const [pendingLayerFilters, setPendingLayerFilters] = useState({
        user_type: "",
        bike_type: "",
    });
    const [compareLayers, setCompareLayers] = useState([]);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [showTooltip, setShowTooltip] = useState(false);
    const previousFiltersRef = useRef(filters);
    const overlayRef = useRef(null);
    const compareButtonRef = useRef(null);
    const comparePanelRef = useRef(null);
    const compareHoverCloseTimeoutRef = useRef(null);
    const addLayerButtonRef = useRef(null);
    const addLayerTooltipRef = useRef(null);
    const tooltipAnimationFrameRef = useRef(null);
    const hasPinnedCompareLayers = compareLayers.length > 0;
    const isComparePanelOpen = isCompareMode || isCompareHovered;

    const baseClassFilters = useMemo(
        () => ({
            user_type: filters?.user_type,
            bike_type: filters?.bike_type,
        }),
        [filters],
    );

    const baseLayerKey = useMemo(
        () => buildLayerKey(baseClassFilters),
        [baseClassFilters],
    );

    const {
        layerData: comparedLayerData,
        loading: compareLoading,
        error: compareError,
        refetch: refetchCompare,
    } = useCompareTemporalLayers({
        filters: stripClassFilters(filters),
        layers: compareLayers,
        enabled: hasPinnedCompareLayers,
    });

    const comparedLayers = useMemo(
        () =>
            compareLayers.map((layer) => ({
                ...layer,
                ...(comparedLayerData.find(
                    (entry) => entry.id === layer.id,
                ) ?? {
                    dayHourStats: [],
                    dayStats: [],
                    hourStats: [],
                    dateStats: [],
                    loading: false,
                    error: null,
                }),
            })),
        [compareLayers, comparedLayerData],
    );

    const baseLayer = useMemo(
        () => ({
            id: "base-layer",
            label: `Current: ${buildLayerLabel(baseClassFilters)}`,
            color: COMPARE_LAYER_COLORS[0],
            colorscale: COMPARE_LAYER_SCALES[0],
            visible: true,
            dayHourStats,
            dayStats,
            hourStats,
            dateStats,
            loading,
            error,
        }),
        [baseClassFilters, dayHourStats, dayStats, hourStats, dateStats, loading, error],
    );

    const activeLayers = useMemo(() => {
        if (!hasPinnedCompareLayers) return [baseLayer];
        return [baseLayer, ...comparedLayers.filter((layer) => layer.visible)];
    }, [hasPinnedCompareLayers, baseLayer, comparedLayers]);

    const mergedLoading = loading || (hasPinnedCompareLayers && compareLoading);
    const mergedError = error || (hasPinnedCompareLayers ? compareError : null);
    const isActionsDisabled = mergedLoading || mergedError;

    const handleRefetchAll = () =>
        Promise.all([
            refetch(),
            hasPinnedCompareLayers ? refetchCompare() : Promise.resolve(),
        ]);

    const handleCompareToggle = () => {
        // If the panel is currently closed but hovered, open it without toggling (to prevent accidental close when moving mouse between button and panel)
        if (!isCompareMode && isCompareHovered) {
            if (compareHoverCloseTimeoutRef.current) {
                clearTimeout(compareHoverCloseTimeoutRef.current);
                compareHoverCloseTimeoutRef.current = null;
            }
            setIsCompareMode(true);
            setIsCompareHovered(false);
        } else {
            // Otherwise, toggle the compare mode as usual
            setIsCompareMode((prev) => !prev);
        }
    };

    const handleCompareHoverEnter = () => {
        if (compareHoverCloseTimeoutRef.current) {
            clearTimeout(compareHoverCloseTimeoutRef.current);
            compareHoverCloseTimeoutRef.current = null;
        }

        setIsCompareHovered(true);
    };

    const closeCompareHoverWithDelay = () => {
        if (compareHoverCloseTimeoutRef.current) {
            clearTimeout(compareHoverCloseTimeoutRef.current);
        }

        compareHoverCloseTimeoutRef.current = setTimeout(() => {
            setIsCompareHovered(false);
            compareHoverCloseTimeoutRef.current = null;
        }, 120);
    };

    const handleCompareHoverLeave = (event) => {
        const nextTarget = event.relatedTarget;
        const buttonNode = compareButtonRef.current;
        const panelNode = comparePanelRef.current;

        if (!(nextTarget instanceof Node)) {
            closeCompareHoverWithDelay();
            return;
        }

        const isInsideButton = buttonNode
            ? buttonNode.contains(nextTarget)
            : false;
        const isInsidePanel = panelNode
            ? panelNode.contains(nextTarget)
            : false;

        if (isInsideButton || isInsidePanel) {
            return;
        }

        closeCompareHoverWithDelay();
    };

    const handlePendingFilterChange = (key, value) => {
        setPendingLayerFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleAddLayer = () => {
        const normalizedFilters = {
            user_type: pendingLayerFilters.user_type || undefined,
            bike_type: pendingLayerFilters.bike_type || undefined,
        };
        const candidateKey = buildLayerKey(normalizedFilters);

        if (candidateKey === baseLayerKey) return;

        const hasDuplicate = compareLayers.some(
            (layer) => buildLayerKey(layer.filters) === candidateKey,
        );
        if (hasDuplicate) return;

        const colorIndex =
            (compareLayers.length + 1) % COMPARE_LAYER_COLORS.length;

        setCompareLayers((prev) => [
            ...prev,
            {
                id: `compare-layer-${Date.now()}-${prev.length}`,
                filters: normalizedFilters,
                label: buildLayerLabel(normalizedFilters),
                color: COMPARE_LAYER_COLORS[colorIndex],
                colorscale: COMPARE_LAYER_SCALES[colorIndex],
                visible: true,
            },
        ]);

        if (compareHoverCloseTimeoutRef.current) {
            clearTimeout(compareHoverCloseTimeoutRef.current);
            compareHoverCloseTimeoutRef.current = null;
        }
        setIsCompareMode(false);
        setIsCompareHovered(false);
    };

    const handleResetCompare = () => {
        setCompareLayers([]);
        setPendingLayerFilters({ user_type: "", bike_type: "" });
    };

    const handleRemoveLayer = (layerId) => {
        setCompareLayers((prev) =>
            prev.filter((layer) => layer.id !== layerId),
        );
    };

    const handleToggleLayerVisibility = (layerId) => {
        setCompareLayers((prev) =>
            prev.map((layer) =>
                layer.id === layerId
                    ? { ...layer, visible: !layer.visible }
                    : layer,
            ),
        );
    };

    const pendingCandidateKey = useMemo(
        () =>
            buildLayerKey({
                user_type: pendingLayerFilters.user_type || undefined,
                bike_type: pendingLayerFilters.bike_type || undefined,
            }),
        [pendingLayerFilters],
    );

    const isPendingSelectionDuplicate = useMemo(() => {
        if (pendingCandidateKey === baseLayerKey) return true;
        return compareLayers.some(
            (layer) => buildLayerKey(layer.filters) === pendingCandidateKey,
        );
    }, [baseLayerKey, compareLayers, pendingCandidateKey]);

    useEffect(() => {
        if (!onCompareModeChange) return;

        onCompareModeChange(hasPinnedCompareLayers);

        return () => {
            onCompareModeChange(false);
        };
    }, [hasPinnedCompareLayers, onCompareModeChange]);

    useEffect(() => {
        const previousFilters = previousFiltersRef.current ?? {};
        const filtersChanged =
            JSON.stringify(previousFilters) !== JSON.stringify(filters ?? {});

        if (!filtersChanged) return;

        previousFiltersRef.current = filters;

        if (!isCompareMode && compareLayers.length === 0) return;

        setIsCompareMode(false);
        setCompareLayers([]);
        setPendingLayerFilters({ user_type: "", bike_type: "" });
    }, [filters, isCompareMode, compareLayers.length]);

    useEffect(() => {
        if (!isCompareMode) return;

        const handleClickOutsideOverlay = (event) => {
            const overlayNode = overlayRef.current;
            if (!overlayNode) return;

            if (!overlayNode.contains(event.target)) {
                setIsCompareMode(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutsideOverlay);

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutsideOverlay,
            );
        };
    }, [isCompareMode]);

    useEffect(
        () => () => {
            if (compareHoverCloseTimeoutRef.current) {
                clearTimeout(compareHoverCloseTimeoutRef.current);
            }

            if (tooltipAnimationFrameRef.current) {
                cancelAnimationFrame(tooltipAnimationFrameRef.current);
                tooltipAnimationFrameRef.current = null;
            }
        },
        [],
    );

    const positionAddLayerTooltip = (clientX, clientY) => {
        const overlayRect = overlayRef.current?.getBoundingClientRect();
        const tooltipNode = addLayerTooltipRef.current;
        if (!overlayRect || !tooltipNode) return;

        const nextX = clientX - overlayRect.left;
        const nextY = clientY - overlayRect.top - 12;

        if (tooltipAnimationFrameRef.current) {
            cancelAnimationFrame(tooltipAnimationFrameRef.current);
        }

        tooltipAnimationFrameRef.current = requestAnimationFrame(() => {
            tooltipNode.style.left = `${nextX}px`;
            tooltipNode.style.top = `${nextY}px`;
            tooltipAnimationFrameRef.current = null;
        });
    };

    const handleAddLayerMouseEnter = (event) => {
        if (!isPendingSelectionDuplicate) {
            setShowTooltip(false);
            return;
        }

        const overlayRect = overlayRef.current?.getBoundingClientRect();
        if (overlayRect) {
            setTooltipPosition({
                x: event.clientX - overlayRect.left,
                y: event.clientY - overlayRect.top - 12,
            });
        }
        setShowTooltip(true);
    };

    const handleAddLayerMouseMove = (event) => {
        if (!isPendingSelectionDuplicate) {
            setShowTooltip(false);
            return;
        }

        positionAddLayerTooltip(event.clientX, event.clientY);
    };

    const handleAddLayerMouseLeave = () => {
        if (tooltipAnimationFrameRef.current) {
            cancelAnimationFrame(tooltipAnimationFrameRef.current);
            tooltipAnimationFrameRef.current = null;
        }
        setShowTooltip(false);
    };

    const getAddLayerTooltipText = () => {
        if (isPendingSelectionDuplicate) {
            return "This surface is already present. Change User Type or Bike Type.";
        }
        return null;
    };

    return (
        <section className="page-card">
            <header className="page-card__header">
                <div className="page-card__heading">
                    <span className="page-card__eyebrow">02 — Rhythms</span>
                    <h2 className="page-card__title">
                        The week, hour by hour.
                    </h2>
                    <p className="page-card__subtitle">
                        How ridership swells and recedes across days of the week
                        and hours of the day.
                    </p>
                </div>
                <div
                    className={`page-card__actions${isActionsDisabled ? " surface-actions--disabled" : ""}`}
                    aria-disabled={isActionsDisabled}
                >
                    <MetricSelector
                        activeMetric={activeMetric}
                        setActiveMetric={setActiveMetric}
                        disabled={isActionsDisabled}
                    />
                </div>
            </header>
            <div className="page-card__body">
                <div className="surface-plot-stack">
                    <SurfaceGraph
                        data={baseLayer.dayHourStats}
                        activeMetric={activeMetric}
                        setCoordinates={setCoordinates}
                        loading={mergedLoading}
                        error={mergedError}
                        onRefetch={handleRefetchAll}
                        compareMode={hasPinnedCompareLayers}
                        layers={activeLayers}
                    />


                    <div ref={overlayRef} className={"surface-plot-overlay"}>
                        <button
                            ref={compareButtonRef}
                            type="button"
                            className={`surface-compare-btn${(isCompareMode || isCompareHovered) && !mergedLoading ? " is-active" : ""}`}
                            onClick={handleCompareToggle}
                            onMouseEnter={handleCompareHoverEnter}
                            onMouseLeave={handleCompareHoverLeave}
                            disabled={mergedLoading || mergedError}
                        >
                            <span
                                className="surface-compare-btn__icon"
                                aria-hidden="true"
                            >
                                <i className="fa-solid fa-code-compare" />
                            </span>
                            Compare
                        </button>

                        <div
                            ref={comparePanelRef}
                            className={`surface-compare-panel${isComparePanelOpen ? " is-open" : ""}`}
                            role="dialog"
                            aria-label="Compare surfaces"
                            onMouseEnter={handleCompareHoverEnter}
                            onMouseLeave={handleCompareHoverLeave}
                        >
                            <div className="surface-compare-panel__controls">
                                {CLASS_FILTER_KEYS.map((key) => (
                                    <label
                                        key={key}
                                        className="surface-compare-field"
                                    >
                                        <span>{FILTERS[key].label}</span>
                                        <CompareFilterDropdown
                                            value={pendingLayerFilters[key]}
                                            options={FILTERS[key].options}
                                            onChange={(nextValue) =>
                                                handlePendingFilterChange(
                                                    key,
                                                    nextValue,
                                                )
                                            }
                                        />
                                    </label>
                                ))}
                                <div
                                    onMouseEnter={handleAddLayerMouseEnter}
                                    onMouseMove={handleAddLayerMouseMove}
                                    onMouseLeave={handleAddLayerMouseLeave}
                                >
                                    <button
                                        ref={addLayerButtonRef}
                                        type="button"
                                        className="surface-compare-add"
                                        onClick={handleAddLayer}
                                        disabled={isPendingSelectionDuplicate}
                                    >
                                        <span
                                            className="surface-btn-icon"
                                            aria-hidden="true"
                                        >
                                            <i className="fa-solid fa-plus" />
                                        </span>
                                        Add Surface
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    className="surface-compare-reset"
                                    onClick={handleResetCompare}
                                    disabled={compareLayers.length === 0}
                                >
                                    <span
                                        className="surface-btn-icon"
                                        aria-hidden="true"
                                    >
                                        <i className="fa-solid fa-rotate-left" />
                                    </span>
                                    Reset
                                </button>
                            </div>

                            <details className="surface-layer-list" open>
                                <summary>
                                    <span className="surface-layer-list__title">
                                        Surfaces ({1 + compareLayers.length})
                                    </span>
                                    <span
                                        className="surface-layer-list__hint"
                                        aria-hidden="true"
                                    >
                                        <span className="surface-layer-list__hint-open">
                                            Collapse
                                        </span>
                                        <span className="surface-layer-list__hint-closed">
                                            Expand
                                        </span>
                                    </span>
                                    <span
                                        className="surface-layer-list__chevron"
                                        aria-hidden="true"
                                    >
                                        <i className="fa-solid fa-chevron-right" />
                                    </span>
                                </summary>
                                <div className="surface-layer-list__items">
                                    <div className="surface-layer-item is-base">
                                        <span
                                            className="surface-layer-swatch"
                                            style={{
                                                backgroundColor:
                                                    baseLayer.color,
                                            }}
                                        />
                                        <span className="surface-layer-name">
                                            {baseLayer.label}
                                        </span>
                                    </div>

                                    {comparedLayers.map((layer) => (
                                        <div
                                            key={layer.id}
                                            className="surface-layer-item"
                                        >
                                            <span
                                                className="surface-layer-swatch"
                                                style={{
                                                    backgroundColor:
                                                        layer.color,
                                                }}
                                            />
                                            <span className="surface-layer-name">
                                                {layer.label}
                                            </span>
                                            <button
                                                type="button"
                                                className={`surface-layer-toggle${layer.visible ? " is-on" : ""}`}
                                                onClick={() =>
                                                    handleToggleLayerVisibility(
                                                        layer.id,
                                                    )
                                                }
                                            >
                                                <span
                                                    className="surface-btn-icon"
                                                    aria-hidden="true"
                                                >
                                                    <i
                                                        className={`fa-solid ${layer.visible ? "fa-eye-slash" : "fa-eye"}`}
                                                    />
                                                </span>
                                                {layer.visible
                                                    ? "Hide"
                                                    : "Show"}
                                            </button>
                                            <button
                                                type="button"
                                                className="surface-layer-delete"
                                                onClick={() =>
                                                    handleRemoveLayer(layer.id)
                                                }
                                            >
                                                <span
                                                    className="surface-btn-icon"
                                                    aria-hidden="true"
                                                >
                                                    <i className="fa-solid fa-trash" />
                                                </span>
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>

                        {showTooltip && getAddLayerTooltipText() && (
                            <div
                                ref={addLayerTooltipRef}
                                className="surface-compare-add-tooltip"
                                style={{
                                    left: `${tooltipPosition.x}px`,
                                    top: `${tooltipPosition.y}px`,
                                }}
                                role="tooltip"
                            >
                                {getAddLayerTooltipText()}
                            </div>
                        )}
                    </div>
                </div>

                <SurfaceHistograms
                    hourData={baseLayer.hourStats}
                    dayData={baseLayer.dayStats}
                    activeMetric={activeMetric}
                    coordinates={coordinates}
                    loading={mergedLoading}
                    error={mergedError}
                    onRefetch={handleRefetchAll}
                    compareMode={hasPinnedCompareLayers}
                    layers={activeLayers}
                />

                <SurfaceLineChart
                    dateData={baseLayer.dateStats}
                    activeMetric={activeMetric}
                    loading={mergedLoading}
                    error={mergedError}
                    onRefetch={handleRefetchAll}
                    compareMode={hasPinnedCompareLayers}
                    layers={activeLayers}
                />

                <VisualizationGuide
                    mapName="Weekly Rhythm"
                    title="How To Read It"
                    summary="The 3D surface maps your metric across every day-hour cell. In Compare mode, you can overlay multiple surfaces to inspect how rhythms shift between user and bike groups, while histograms help verify aggregate day/hour effects."
                    hints={[
                        {
                            title: "Start from the baseline",
                            text: "Read the Current surface first, then add comparison surfaces one at a time so differences in ridges and peaks remain interpretable.",
                        },
                        {
                            title: "Use Compare as context",
                            text: "Add multiple user/bike combinations from Compare, then use Hide/Show to isolate one layer at a time and confirm whether a pattern is global or segment-specific.",
                        },
                        {
                            title: "Cross-check with histograms",
                            text: "When a surface appears higher in one region, confirm if the gap is driven by specific days or hours using the aligned histogram panels.",
                        },
                    ]}
                />
            </div>
        </section>
    );
}

export default TemporalPage;
