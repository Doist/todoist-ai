/**
 * Duration parser utility for converting human-readable duration strings
 * to minutes using a restricted, language-neutral syntax.
 *
 * Supported formats:
 * - "2h" (hours only)
 * - "90m" (minutes only)
 * - "2h30m" (hours + minutes)
 * - "1.5h" (decimal hours)
 * - Supports optional spaces: "2h 30m"
 */

interface ParsedDuration {
    minutes: number
}

export class DurationParseError extends Error {
    constructor(input: string, reason: string) {
        super(`Invalid duration format "${input}": ${reason}`)
        this.name = 'DurationParseError'
    }
}

/**
 * Parses duration string in restricted syntax to minutes.
 * Max duration: 1440 minutes (24 hours)
 *
 * @param durationStr - Duration string like "2h30m", "45m", "1.5h"
 * @returns Parsed duration in minutes
 * @throws DurationParseError for invalid formats
 */
export function parseDuration(durationStr: string): ParsedDuration {
    if (!durationStr || typeof durationStr !== 'string') {
        throw new DurationParseError(durationStr, 'Duration must be a non-empty string')
    }

    // Remove all spaces and convert to lowercase
    const normalized = durationStr.trim().toLowerCase().replace(/\s+/g, '')

    // Check for empty string after trimming
    if (!normalized) {
        throw new DurationParseError(durationStr, 'Duration must be a non-empty string')
    }

    // Validate format - must contain only numbers, dots, h, and m
    if (!/^[\d.]+[hm](?:[\d.]+[hm])?$/.test(normalized)) {
        throw new DurationParseError(durationStr, 'Use format like "2h", "30m", "2h30m", or "1.5h"')
    }

    // Check for duplicate units
    const hCount = (normalized.match(/h/g) || []).length
    const mCount = (normalized.match(/m/g) || []).length
    if (hCount > 1 || mCount > 1) {
        throw new DurationParseError(durationStr, 'Use format like "2h", "30m", "2h30m", or "1.5h"')
    }

    let totalMinutes = 0
    let hasHours = false
    let hasMinutes = false

    // Extract hours if present
    const hoursMatch = normalized.match(/([\d.]+)h/)
    if (hoursMatch?.[1]) {
        const hoursStr = hoursMatch[1]
        // Check for malformed numbers like "2.", "2..5", or empty
        if (hoursStr.endsWith('.') || hoursStr === '' || hoursStr.includes('..')) {
            throw new DurationParseError(durationStr, 'Hours must be a positive number')
        }
        const hours = Number.parseFloat(hoursStr)
        if (Number.isNaN(hours) || hours < 0) {
            throw new DurationParseError(durationStr, 'Hours must be a positive number')
        }
        totalMinutes += hours * 60
        hasHours = true
    }

    // Extract minutes if present
    const minutesMatch = normalized.match(/([\d.]+)m/)
    if (minutesMatch?.[1]) {
        const minutesStr = minutesMatch[1]
        // Check for malformed numbers like "2.", "2..5", or empty
        if (minutesStr.endsWith('.') || minutesStr === '' || minutesStr.includes('..')) {
            throw new DurationParseError(durationStr, 'Minutes must be a positive number')
        }
        const minutes = Number.parseFloat(minutesStr)
        if (Number.isNaN(minutes) || minutes < 0) {
            throw new DurationParseError(durationStr, 'Minutes must be a positive number')
        }
        // Don't allow decimal minutes
        if (minutes % 1 !== 0) {
            throw new DurationParseError(
                durationStr,
                'Minutes must be a whole number (use decimal hours instead)',
            )
        }
        totalMinutes += minutes
        hasMinutes = true
    }

    // Must have at least hours or minutes
    if (!hasHours && !hasMinutes) {
        throw new DurationParseError(durationStr, 'Must specify at least hours (h) or minutes (m)')
    }

    // Round to nearest minute (handles decimal hours)
    totalMinutes = Math.round(totalMinutes)

    // Validate minimum duration
    if (totalMinutes === 0) {
        throw new DurationParseError(durationStr, 'Duration must be greater than 0 minutes')
    }

    // Validate maximum duration (24 hours = 1440 minutes)
    if (totalMinutes > 1440) {
        throw new DurationParseError(durationStr, 'Duration cannot exceed 24 hours (1440 minutes)')
    }

    return { minutes: totalMinutes }
}

/**
 * Formats minutes back to a human-readable duration string.
 * Used when returning task data to LLMs.
 *
 * @param minutes - Duration in minutes
 * @returns Formatted duration string like "2h30m" or "45m"
 */
export function formatDuration(minutes: number): string {
    if (minutes <= 0) return '0m'

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours === 0) {
        return `${remainingMinutes}m`
    }

    if (remainingMinutes === 0) {
        return `${hours}h`
    }

    return `${hours}h${remainingMinutes}m`
}
