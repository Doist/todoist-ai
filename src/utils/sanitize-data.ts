/**
 * Removes all null fields, empty objects, and empty arrays from an object recursively.
 * This ensures that data sent to agents doesn't include unnecessary empty values.
 *
 * @param obj - The object to sanitize
 * @returns A new object with all null fields, empty objects, and empty arrays removed
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
                const cleanedValue = removeNullFields(value)

                // Skip empty arrays
                if (Array.isArray(cleanedValue) && cleanedValue.length === 0) {
                    continue
                }

                // Skip empty objects
                if (
                    cleanedValue !== null &&
                    typeof cleanedValue === 'object' &&
                    !Array.isArray(cleanedValue) &&
                    Object.keys(cleanedValue).length === 0
                ) {
                    continue
                }

                sanitized[key] = cleanedValue
            }
        }
        return sanitized as T
    }

    return obj
}
