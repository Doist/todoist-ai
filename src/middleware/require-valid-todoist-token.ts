import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { validateTodoistToken } from '../utils/validate-todoist-token.js'

type StaticTokenSource = {
    type: 'static'
    apiKey: string
    baseUrl?: string
}

type DynamicTokenSource = {
    type: 'dynamic'
    getApiKey: (req: Request) => string | undefined
    baseUrl?: string
}

type TokenSource = StaticTokenSource | DynamicTokenSource

type RequireValidTodoistTokenOptions = TokenSource & {
    /**
     * Cache TTL in milliseconds. Defaults to 300_000 (5 minutes) for static,
     * 120_000 (2 minutes) for dynamic.
     */
    cacheTtlMs?: number

    /**
     * URL for the Protected Resource Metadata document (RFC 9728).
     * Included in the WWW-Authenticate header when returning 401.
     * If omitted, the header is sent without resource_metadata.
     */
    resourceMetadataUrl?: string
}

type CacheEntry = {
    valid: boolean
    expiresAt: number
}

const DEFAULT_STATIC_TTL_MS = 300_000 // 5 minutes
const DEFAULT_DYNAMIC_TTL_MS = 120_000 // 2 minutes

const cache = new Map<string, CacheEntry>()

function getCachedResult(apiKey: string): boolean | undefined {
    const entry = cache.get(apiKey)
    if (entry && Date.now() < entry.expiresAt) {
        return entry.valid
    }
    if (entry) {
        cache.delete(apiKey)
    }
    return undefined
}

function setCachedResult(apiKey: string, valid: boolean, ttlMs: number): void {
    cache.set(apiKey, { valid, expiresAt: Date.now() + ttlMs })
}

function buildWwwAuthenticateHeader(resourceMetadataUrl?: string): string {
    if (resourceMetadataUrl) {
        return `Bearer resource_metadata="${resourceMetadataUrl}"`
    }
    return 'Bearer'
}

function sendUnauthorized(res: Response, resourceMetadataUrl?: string): void {
    res.status(401).set('WWW-Authenticate', buildWwwAuthenticateHeader(resourceMetadataUrl)).json({
        error: 'invalid_token',
        error_description: 'Todoist API token is invalid or expired',
    })
}

/**
 * Express middleware that validates the Todoist API token before MCP processing.
 *
 * Returns HTTP 401 with a spec-compliant WWW-Authenticate header if the token
 * is invalid, allowing MCP clients to trigger OAuth token refresh.
 */
function requireValidTodoistToken(options: RequireValidTodoistTokenOptions): RequestHandler {
    const defaultTtl = options.type === 'static' ? DEFAULT_STATIC_TTL_MS : DEFAULT_DYNAMIC_TTL_MS
    const ttlMs = options.cacheTtlMs ?? defaultTtl
    const { resourceMetadataUrl } = options

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const apiKey = options.type === 'static' ? options.apiKey : options.getApiKey(req)

        if (!apiKey) {
            sendUnauthorized(res, resourceMetadataUrl)
            return
        }

        const cached = getCachedResult(apiKey)
        if (cached !== undefined) {
            if (cached) {
                next()
            } else {
                sendUnauthorized(res, resourceMetadataUrl)
            }
            return
        }

        try {
            const valid = await validateTodoistToken(apiKey, options.baseUrl)
            setCachedResult(apiKey, valid, ttlMs)

            if (valid) {
                next()
            } else {
                sendUnauthorized(res, resourceMetadataUrl)
            }
        } catch (error) {
            // Fail open on transient errors — don't block all requests during
            // a Todoist API blip. Tool calls will fail with descriptive errors.
            console.warn('[Token validation] Transient error, proceeding:', error)
            next()
        }
    }
}

/**
 * Clear the token validation cache. Useful for testing.
 */
function clearTokenValidationCache(): void {
    cache.clear()
}

export { clearTokenValidationCache, requireValidTodoistToken, type RequireValidTodoistTokenOptions }
