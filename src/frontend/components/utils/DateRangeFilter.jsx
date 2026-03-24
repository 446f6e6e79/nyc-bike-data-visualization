import { useCallback, useEffect, useMemo, useState } from 'react'
import useDatasetDateRange from '../../hooks/useDatasetDateRange.js'

const MAX_COVERED_MONTHS = 6
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function parseApiDate(value) {
  if (!value) return null
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function formatDateParam(date) {
  if (!date) return undefined

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function dateToIndex(date, minDate) {
  return (date.getFullYear() - minDate.getFullYear()) * 12 +
    (date.getMonth() - minDate.getMonth())
}

function indexToDate(index, minDate) {
  return new Date(minDate.getFullYear(), minDate.getMonth() + index, 1)
}

function formatMonth(date) {
  return `${MONTH_LABELS[date.getMonth()]}`
}

// "Jan 2026" or "Jan 2026 → Feb 2026"
function formatDateLabel(startDate, endDate, monthCount) {
  const start = `${MONTH_LABELS[startDate.getMonth()]} ${startDate.getFullYear()}`
  if (monthCount === 1) return start
  const end = `${MONTH_LABELS[endDate.getMonth()]} ${endDate.getFullYear()}`
  return `${start} → ${end}`
}

function getIndexFromClientX(clientX, rect, totalMonths) {
  if (rect.width === 0 || totalMonths <= 1) return 0
  const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
  return clamp(Math.round(ratio * totalMonths), 0, totalMonths)
}

function Handle({ side, value, min, max, label, onStep }) {
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); onStep(value - 1) }
    if (event.key === 'ArrowRight') { event.preventDefault(); onStep(value + 1) }
  }, [onStep, value])

  return (
    <button
      type="button"
      role="slider"
      aria-label={side === 'start' ? 'Start month handle' : 'End month handle'}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={label}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 30,
        /* invisible hit area */
        width: '20px',
        height: '100%',
        background: 'none',
        border: 'none',
        outline: 'none',
        padding: 0,
        cursor: 'ew-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(side === 'start' ? { left: '-10px' } : { right: '-10px' }),
      }}
    >
      {/* The visible part: a single thin line */}
      <div style={{
        width: '2px',
        height: '18px',
        borderRadius: '2px',
        background: 'rgba(255,255,255,0.7)',
        pointerEvents: 'none',
      }} />
    </button>
  )
}

function useDatasetState() {
  try {
    return useDatasetDateRange()
  } catch (hookError) {
    if (!String(hookError?.message).includes('No QueryClient set')) throw hookError
    return { dateRange: null, loading: false, error: null }
  }
}

export default function DateRangeFilter({ value, onCommit }) {
  const { dateRange, loading, error } = useDatasetState()

  const minDate = useMemo(() => {
    const parsed = parseApiDate(dateRange?.min_date)
    return parsed ? startOfMonth(parsed) : null
  }, [dateRange?.min_date])

  const maxDate = useMemo(() => {
    const parsed = parseApiDate(dateRange?.max_date)
    return parsed ? startOfMonth(parsed) : null
  }, [dateRange?.max_date])

  const totalMonths = useMemo(() => {
    if (!minDate || !maxDate) return 0
    return dateToIndex(maxDate, minDate) + 1
  }, [maxDate, minDate])

  const maxWindowSize = useMemo(
    () => clamp(totalMonths, 1, MAX_COVERED_MONTHS),
    [totalMonths],
  )

  // Always select the last available month as the initial range
  const [range, setRange] = useState(null);
  const [hasCommittedInitial, setHasCommittedInitial] = useState(false);

  useEffect(() => {
    if (!minDate || !maxDate || totalMonths === 0) return;
    // Select only the last month
    const lastMonthIndex = totalMonths - 1;
    const nextRange = { startIndex: lastMonthIndex, endIndex: lastMonthIndex };
    setRange((current) => {
      if (current && current.startIndex === nextRange.startIndex && current.endIndex === nextRange.endIndex) return current;
      return nextRange;
    });
  }, [maxDate, minDate, totalMonths]);

  useEffect(() => {
    if (!hasCommittedInitial && range && minDate && onCommit) {
      const startDate = indexToDate(range.startIndex, minDate);
      const endMonth = indexToDate(range.endIndex, minDate);
      onCommit({
        start_date: formatDateParam(startDate),
        end_date: formatDateParam(endOfMonth(endMonth)),
      });
      setHasCommittedInitial(true);
    }
  }, [range, minDate, onCommit, hasCommittedInitial]);

  const selection = useMemo(() => {
    if (!range || !minDate) return null
    const startDate = indexToDate(range.startIndex, minDate)
    const endMonth = indexToDate(range.endIndex, minDate)
    return {
      ...range,
      monthCount: range.endIndex - range.startIndex + 1,
      startDate,
      endDate: endOfMonth(endMonth),
    }
  }, [minDate, range])

  const [isCommitting, setIsCommitting] = useState(false)

  const hasPendingChanges = useMemo(() => {
    if (!selection) return false

    const appliedStartDate = parseApiDate(value?.start_date ?? value?.startDate)
    const appliedEndDate = parseApiDate(value?.end_date ?? value?.endDate)
    const appliedStartTime = appliedStartDate
      ? startOfMonth(appliedStartDate).getTime()
      : null
    const appliedEndTime = appliedEndDate
      ? endOfMonth(appliedEndDate).getTime()
      : null

    return (
      appliedStartTime !== selection.startDate.getTime() ||
      appliedEndTime !== selection.endDate.getTime()
    )
  }, [selection, value?.endDate, value?.end_date, value?.startDate, value?.start_date])

  const handleApply = useCallback(async () => {
    if (!selection || !onCommit || !hasPendingChanges || isCommitting) return

    setIsCommitting(true)
    try {
      await onCommit({
        start_date: formatDateParam(selection.startDate),
        end_date: formatDateParam(selection.endDate),
      })
    } finally {
      setIsCommitting(false)
    }
  }, [hasPendingChanges, isCommitting, onCommit, selection])


  const updateRange = useCallback((nextRange) => {
    if (totalMonths === 0) return
    const rawStartIndex = clamp(nextRange.startIndex, 0, totalMonths - 1)
    const rawEndIndex = clamp(nextRange.endIndex, rawStartIndex, totalMonths - 1)
    const monthCount = clamp(rawEndIndex - rawStartIndex + 1, 1, maxWindowSize)
    const endIndex = rawEndIndex
    const startIndex = clamp(endIndex - monthCount + 1, 0, endIndex)
    setRange({ startIndex, endIndex })
  }, [maxWindowSize, totalMonths])

  const resizeStart = useCallback((nextStartIndex) => {
    if (!selection) return
    const minStartIndex = Math.max(0, selection.endIndex - maxWindowSize + 1)
    const startIndex = clamp(nextStartIndex, minStartIndex, selection.endIndex)
    updateRange({ startIndex, endIndex: selection.endIndex })
  }, [maxWindowSize, selection, updateRange])

  const resizeEnd = useCallback((nextEndIndex) => {
    if (!selection) return
    const maxEndIndex = Math.min(totalMonths - 1, selection.startIndex + maxWindowSize - 1)
    const endIndex = clamp(nextEndIndex, selection.startIndex, maxEndIndex)
    updateRange({ startIndex: selection.startIndex, endIndex })
  }, [maxWindowSize, selection, totalMonths, updateRange])

  const moveWindow = useCallback((nextStartIndex) => {
    if (!selection) return
    const maxStartIndex = Math.max(0, totalMonths - selection.monthCount)
    const startIndex = clamp(nextStartIndex, 0, maxStartIndex)
    const endIndex = startIndex + selection.monthCount - 1
    updateRange({ startIndex, endIndex })
  }, [selection, totalMonths, updateRange])

  const beginPointerAction = useCallback((event, mode) => {
    if (!selection) return
    event.preventDefault()
    event.stopPropagation()
    const track = event.currentTarget.closest('[data-month-slider]')
    if (!track) return
    const rect = track.getBoundingClientRect()
    const startBoundary = selection.startIndex
    const pointerBoundary = getIndexFromClientX(event.clientX, rect, totalMonths)
    const pointerOffset = pointerBoundary - startBoundary
    const handleMove = (moveEvent) => {
      const nextBoundary = getIndexFromClientX(moveEvent.clientX, rect, totalMonths)
      if (mode === 'resize-start') { resizeStart(nextBoundary); return }
      if (mode === 'resize-end') { resizeEnd(nextBoundary - 1); return }
      moveWindow(nextBoundary - pointerOffset)
    }
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }, [moveWindow, resizeEnd, resizeStart, selection, totalMonths])

  const markers = useMemo(() => {
    if (!selection || !minDate) return []
    return Array.from({ length: totalMonths }, (_, index) => {
      const monthDate = indexToDate(index, minDate)
      const isSelected = index >= selection.startIndex && index <= selection.endIndex
      const isBoundary = index === 0 || index === totalMonths - 1
      const isQuarter = monthDate.getMonth() % 3 === 0
      const isYearStart = monthDate.getMonth() === 0
      const showLabel = totalMonths <= 12 || isBoundary || isQuarter
      return {
        key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
        left: totalMonths === 1 ? 0 : (index / totalMonths) * 100,
        label: showLabel ? formatMonth(monthDate) : '',
        year: monthDate.getFullYear(),
        isSelected,
        isYearStart: isYearStart && index !== 0,
      }
    })
  }, [minDate, selection, totalMonths])

  useEffect(() => {
    if (
      !hasCommittedInitial &&
      minDate &&
      maxDate &&
      selection &&
      onCommit
    ) {
      onCommit({
        start_date: formatDateParam(selection.startDate),
        end_date: formatDateParam(selection.endDate),
      });
      setHasCommittedInitial(true);
    }
  }, [minDate, maxDate, selection, onCommit, hasCommittedInitial]);

  if (loading || error || !selection || !minDate || !maxDate) return null

  const selectionLeft = (selection.startIndex / totalMonths) * 100
  const selectionWidth = (selection.monthCount / totalMonths) * 100
  const dateLabel = formatDateLabel(selection.startDate, selection.endDate, selection.monthCount)

  // Year labels: centred over each year's span of months
  const yearLabels = (() => {
    const groups = {}
    markers.forEach((m) => {
      if (!groups[m.year]) groups[m.year] = { year: m.year, first: m.left, last: m.left }
      groups[m.year].last = m.left
    })
    return Object.values(groups).map(({ year, first, last }) => ({
      year,
      left: (first + last) / 2 + (50 / totalMonths),
    }))
  })()

  return (
    <div style={{
      fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      userSelect: 'none',
      borderRadius: '16px',
      background: 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(220,232,255,0.13) 100%)',
      padding: '14px 18px 20px',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.28)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.45)',
      minWidth: '36rem',
      color: 'white',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
        <span style={{
          fontSize: '9px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          fontWeight: 600,
        }}>
          Date Window
        </span>
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.95)',
          letterSpacing: '-0.01em',
        }}>
          {dateLabel}
        </span>
      </div>

      {/* Slider track */}
      <div
        data-month-slider
        style={{
          position: 'relative',
          height: '52px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(0,0,0,0.18)',
          overflow: 'visible',
        }}
      >
        {/* Year labels — float above the track */}
        {yearLabels.length > 1 && yearLabels.map(({ year, left }) => (
          <div key={year} style={{
            position: 'absolute',
            bottom: 'calc(100% + 5px)',
            left: `${left}%`,
            transform: 'translateX(-50%)',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            {year}
          </div>
        ))}

        {/* Markers */}
        <div style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          zIndex: 0,
        }}>
          {markers.map((marker) => (
            <div
              key={marker.key}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${marker.left}%`,
                width: `${100 / totalMonths}%`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Year divider — full-height, more prominent */}
              {marker.isYearStart && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: '1px',
                  background: 'rgba(255,255,255,0.18)',
                  zIndex: 1,
                }} />
              )}

              {/* Month tick */}
              <div style={{
                width: marker.isYearStart ? '1.5px' : '1px',
                height: marker.isSelected ? '12px' : '6px',
                borderRadius: '1px',
                marginTop: marker.isSelected ? '6px' : '9px',
                background: marker.isSelected
                  ? 'rgba(255,255,255,0.95)'
                  : 'rgba(255,255,255,0.2)',
                flexShrink: 0,
                transition: 'height 0.15s ease, margin-top 0.15s ease, background 0.15s ease',
              }} />

              {/* Month label */}
              {marker.label && (
                <span style={{
                  position: 'absolute',
                  bottom: '7px',
                  fontSize: '9px',
                  fontWeight: marker.isSelected ? 600 : 400,
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                  color: marker.isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                  transition: 'color 0.15s ease, font-weight 0.15s ease',
                }}>
                  {marker.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Selection window */}
        <div
          onPointerDown={(event) => beginPointerAction(event, 'move')}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            zIndex: 20,
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.38)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
            cursor: 'grab',
            left: `${selectionLeft}%`,
            width: `${selectionWidth}%`,
          }}
          onMouseDown={e => { e.currentTarget.style.cursor = 'grabbing' }}
          onMouseUp={e => { e.currentTarget.style.cursor = 'grab' }}
        >
          {/* Start handle */}
          <div
            onPointerDown={(event) => beginPointerAction(event, 'resize-start')}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '20px',
              transform: 'translateX(-50%)',
              zIndex: 30,
              cursor: 'ew-resize',
            }}
          >
            <Handle
              side="start"
              value={selection.startIndex}
              min={0}
              max={selection.endIndex}
              label={formatMonth(selection.startDate)}
              onStep={resizeStart}
            />
          </div>

          {/* End handle */}
          <div
            onPointerDown={(event) => beginPointerAction(event, 'resize-end')}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: '20px',
              transform: 'translateX(50%)',
              zIndex: 30,
              cursor: 'ew-resize',
            }}
          >
            <Handle
              side="end"
              value={selection.endIndex}
              min={selection.startIndex}
              max={totalMonths - 1}
              label={formatMonth(indexToDate(selection.endIndex, minDate))}
              onStep={resizeEnd}
            />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button
          type="button"
          onClick={handleApply}
          disabled={!hasPendingChanges || isCommitting || !onCommit}
          style={{
            border: '1px solid rgba(255,255,255,0.24)',
            borderRadius: '10px',
            padding: '8px 14px',
            background: isCommitting
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(255,255,255,0.18)',
            color: 'white',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            cursor: !hasPendingChanges || isCommitting || !onCommit ? 'not-allowed' : 'pointer',
            opacity: !hasPendingChanges || !onCommit ? 0.55 : 1,
          }}
        >
          {isCommitting ? 'Loading...' : 'Apply'}
        </button>
      </div>

    </div>
  )
}
