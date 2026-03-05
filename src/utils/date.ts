/**
 * Format a Date using UTC calendar components (YYYY-MM-DD).
 */
export function formatUtcDate(date: Date): string {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Parse a GMT offset string (+HH:MM or -HH:MM) to total minutes.
 * Falls back to 0 for malformed offsets.
 */
export function parseGmtOffsetToMinutes(gmtOffset: string): number {
    const match = /^([+-])(\d{2}):(\d{2})$/.exec(gmtOffset)
    if (!match) {
        return 0
    }

    const [, sign, hours, minutes] = match
    const totalMinutes = Number(hours) * 60 + Number(minutes)
    return sign === '-' ? -totalMinutes : totalMinutes
}

/**
 * Return the date string (YYYY-MM-DD) in a provided GMT offset.
 */
export function getDateInOffset(date: Date, offsetMinutes: number): string {
    const shiftedDate = new Date(date.getTime() + offsetMinutes * 60 * 1000)
    return formatUtcDate(shiftedDate)
}

/**
 * Shift a YYYY-MM-DD date string by the specified number of days in UTC.
 */
export function shiftDateStringByDays(dateString: string, days: number): string {
    const [yearPart, monthPart, dayPart] = dateString.split('-')
    const year = Number(yearPart)
    const month = Number(monthPart)
    const day = Number(dayPart)

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD.`)
    }

    const date = new Date(Date.UTC(year, month - 1, day))
    date.setUTCDate(date.getUTCDate() + days)
    return formatUtcDate(date)
}
