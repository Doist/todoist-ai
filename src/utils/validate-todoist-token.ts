import { TodoistApi } from '@doist/todoist-sdk'

import { extractHttpStatusCode } from './retry.js'

const AUTH_ERROR_CODES = new Set([401, 403])

/**
 * Extract HTTP status code from an error, checking both top-level fields
 * and nested `error.response.status` (common in HTTP client libraries).
 */
function extractAuthStatusCode(error: unknown): number | undefined {
    const direct = extractHttpStatusCode(error)
    if (direct !== undefined) {
        return direct
    }

    // Check nested response object (e.g. { response: { status: 401 } })
    if (error !== null && typeof error === 'object' && 'response' in error) {
        return extractHttpStatusCode((error as Record<string, unknown>).response)
    }

    return undefined
}

/**
 * Validates a Todoist API token by making a lightweight API call.
 *
 * @returns `true` if the token is valid, `false` if it's an auth error (401/403).
 * @throws On transient errors (network failures, 5xx) so the caller can decide.
 */
async function validateTodoistToken(apiKey: string, baseUrl?: string): Promise<boolean> {
    const client = new TodoistApi(apiKey, { baseUrl })
    try {
        await client.getUser()
        return true
    } catch (error) {
        const statusCode = extractAuthStatusCode(error)
        if (statusCode !== undefined && AUTH_ERROR_CODES.has(statusCode)) {
            return false
        }
        throw error
    }
}

export { validateTodoistToken }
