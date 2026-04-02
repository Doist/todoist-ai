const DEFAULT_MAX_RETRIES = 2
const DEFAULT_BASE_DELAY_MS = 500
const DEFAULT_MAX_DELAY_MS = 2000

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504])

type RetryConfig = {
    maxRetries?: number
    baseDelayMs?: number
    maxDelayMs?: number
}

function extractHttpStatusCode(error: unknown): number | undefined {
    if (error === null || error === undefined || typeof error !== 'object') {
        return undefined
    }

    const record = error as Record<string, unknown>

    if (typeof record.httpStatusCode === 'number') {
        return record.httpStatusCode
    }

    if (typeof record.statusCode === 'number') {
        return record.statusCode
    }

    if (typeof record.status === 'number') {
        return record.status
    }

    if (error instanceof Error) {
        const match = error.message.match(/\bHTTP\s+(\d{3})\b/i)
        if (match?.[1]) {
            return Number(match[1])
        }
    }

    return undefined
}

function isTransientError(error: unknown): boolean {
    const statusCode = extractHttpStatusCode(error)
    return statusCode !== undefined && RETRYABLE_STATUS_CODES.has(statusCode)
}

function getRetryDelay({
    attempt,
    baseDelayMs,
    maxDelayMs,
}: {
    attempt: number
    baseDelayMs: number
    maxDelayMs: number
}): number {
    const delay = baseDelayMs * 2 ** attempt
    return Math.min(delay, maxDelayMs)
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function executeWithRetry<T>(fn: () => Promise<T>, config: RetryConfig = {}): Promise<T> {
    const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES
    const baseDelayMs = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS
    const maxDelayMs = config.maxDelayMs ?? DEFAULT_MAX_DELAY_MS

    let lastError: unknown

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error

            if (attempt < maxRetries && isTransientError(error)) {
                const delay = getRetryDelay({ attempt, baseDelayMs, maxDelayMs })
                await sleep(delay)
                continue
            }

            throw error
        }
    }

    throw lastError
}

export { executeWithRetry, extractHttpStatusCode, isTransientError, type RetryConfig }
