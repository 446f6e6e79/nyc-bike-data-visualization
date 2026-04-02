import { useState } from 'react'

/**
 * Custom hook to manage header filters for the application.
 * @param {function} onFiltersChange - Callback function to notify parent components of filter changes, receives the combined filters as an argument 
 * @returns An object containing the current date range, user filters, and handler functions to update these filters and notify the parent component of changes.
 */
export default function useHeaderFilters(onFiltersChange) {
    // Local state for the date range and user filters, which will be combined and passed to the parent component via onFiltersChange
    const [dateRange, setDateRange] = useState(null)
    const [currentUserFilters, setCurrentUserFilters] = useState({})
    // Handler for when the date range is committed 
    const handleDateRangeCommit = (nextDateRange) => {
        setDateRange(nextDateRange)
        onFiltersChange?.({ ...currentUserFilters, ...nextDateRange })
    }
    // Handler for when user filters change
    const handleUserFilterChange = (nextUserFilters) => {
        setCurrentUserFilters(nextUserFilters)
        onFiltersChange?.({ ...dateRange, ...nextUserFilters })
    }

    return {
        dateRange,
        currentUserFilters,
        handleDateRangeCommit,
        handleUserFilterChange,
    }
}