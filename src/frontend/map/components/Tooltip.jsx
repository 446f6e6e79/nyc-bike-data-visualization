import React from 'react'

export default function Tooltip({ object }) {
    if (!object) {
        return null
    }

    if (Array.isArray(object.sourcePosition) && Array.isArray(object.targetPosition)) {
        const rides = Math.round(Number(object.hourly_rides) || 0)
        const fromName = object.stationAName ?? 'Station A'
        const toName = object.stationBName ?? 'Station B'

        return `Trip: ${fromName} → ${toName}\nRides: ${rides}`
    }

    const points = Array.isArray(object.points) ? object.points : []

    if (points.length > 0) {
        const totalUsage = Math.round(
            points.reduce((sum, point) => sum + (Number(point.usage) || 0), 0)
        )
        const uniqueStationIds = [...new Set(points.map((point) => point.stationId).filter(Boolean))]
        const stationPreview = uniqueStationIds.slice(0, 4).join(', ')
        const stationSuffix = uniqueStationIds.length > 4 ? ', …' : ''

        return `Stations: ${points.length}\nUsage: ${totalUsage} rides\nIDs: ${stationPreview}${stationSuffix}`
    }

    const totalUsage = Math.round(Number(object.elevationValue ?? object.colorValue ?? 0) || 0)
    const count = Math.round(Number(object.count ?? 0) || 0)

    return `Stations: ${count}\nUsage: ${totalUsage} rides`
}
