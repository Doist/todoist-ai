/**
 * Removes all null fields and empty objects from an object recursively.
 * Empty arrays are preserved as they carry semantic meaning (e.g., "no results found").
 * This ensures that data sent to agents doesn't include unnecessary empty values.
 *
 * @param obj - The object to sanitize
 * @returns A new object with all null fields and empty objects removed
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

                // Keep empty arrays - they indicate "no results" which is semantically meaningful
                // Only skip empty objects
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
