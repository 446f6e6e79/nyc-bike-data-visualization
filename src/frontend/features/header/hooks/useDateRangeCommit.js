import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAppliedPayload } from '../utils/date_formatter.jsx'

/**
 * Handles commit payload derivation, auto-commit behavior, and apply action state.
 * @param {Object|null} selection - Current slider selection.
 * @param {Object|null} value - Applied date filter value.
 * @param {Function|undefined} onCommit - Commit callback.
 * @param {{startIndex: number, endIndex: number}|null} defaultRange - Current default range to reset auto-commit guard.
 * @returns {{isCommitting: boolean, hasPendingChanges: boolean, handleApply: Function}}
 */
export default function useDateRangeCommit({ selection, value, onCommit, defaultRange }) {  
    // State to track whether a commit action is currently in progress
    const [isCommitting, setIsCommitting] = useState(false)
    const didAutoCommitDefault = useRef(false)
    // Effect to reset the auto-commit guard whenever the defaultRange changes, allowing for auto-commit of the new default range if applicable
    useEffect(() => {
        didAutoCommitDefault.current = false
    }, [defaultRange])
    // Memoized commit payload that derives the start_date and end_date 
    const commitPayload = useMemo(() => {
        if (!selection) return null
        return getAppliedPayload({
            start_date: selection.startDate,
            end_date: selection.endDate,
        })
    }, [selection])
    // Memoized applied payload that derives 
    const appliedPayload = useMemo(
        () => getAppliedPayload(value),
        [value?.start_date, value?.end_date, value?.startDate, value?.endDate],
    )
    // Effect to auto-commit the current selection
    useEffect(() => {
        if (!commitPayload || !onCommit || didAutoCommitDefault.current) return
        didAutoCommitDefault.current = true
        onCommit(commitPayload)
    }, [commitPayload, onCommit])
    // Memoized boolean flag to determine
    const hasPendingChanges = useMemo(
        () => Boolean(commitPayload) && !(
            commitPayload?.start_date === appliedPayload?.start_date
            && commitPayload?.end_date === appliedPayload?.end_date
        ),
        [appliedPayload, commitPayload],
    )
    // Callback to handle the apply action, invoking the onCommit callback with the current commit payload if there are pending changes and a commit is not already in progress
    const handleApply = useCallback(async () => {
        if (!commitPayload || !onCommit || !hasPendingChanges || isCommitting) return

        setIsCommitting(true)
        try {
            await onCommit(commitPayload)
        } finally {
            setIsCommitting(false)
        }
    }, [commitPayload, hasPendingChanges, isCommitting, onCommit])

    return {
        isCommitting,
        hasPendingChanges,
        handleApply,
    }
}