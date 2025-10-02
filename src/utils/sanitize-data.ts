/**
 * Removes all null fields from an object recursively.
 * This ensures that data sent to agents doesn't include null fields.
 *
 * @param obj - The object to sanitize
 * @returns A new object with all null fields removed
 */
export function removeNullFields<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => removeNullFields(item)) as T
    }

    if (typeof obj === 'object') {
        const sanitized: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(obj)) {
            if (value !== null) {
                sanitized[key] = removeNullFields(value)
            }
        }
        return sanitized as T
    }

    return obj
}
