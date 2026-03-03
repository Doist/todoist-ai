import z from 'zod'
import { formatToolExecutionError } from './tool-execution-error.js'

describe('formatToolExecutionError', () => {
    it('formats Todoist API errors with actionable details', () => {
        const output = formatToolExecutionError({
            httpStatusCode: 400,
            responseData: {
                error: 'Invalid due date format',
                errorCode: 42,
                errorTag: 'INVALID_ARGUMENT',
                parameter: 'dueString',
                details: 'Use natural language (e.g., "tomorrow") or YYYY-MM-DD.',
            },
        })

        expect(output).toContain(
            'Todoist API request failed (HTTP 400, code 42, tag INVALID_ARGUMENT).',
        )
        expect(output).toContain('Message: Invalid due date format')
        expect(output).toContain('Field hints: dueString')
        expect(output).toContain('Try next: Fix the field hints above and retry.')
    })

    it('formats nested response errors consistently', () => {
        const output = formatToolExecutionError({
            message: 'Request failed with status code 404',
            response: {
                status: 404,
                data: {
                    message: 'Task not found',
                    errors: [{ field: 'taskId', message: 'No task matches this id' }],
                },
            },
        })

        expect(output).toContain('Todoist API request failed (HTTP 404).')
        expect(output).toContain('Message: Task not found')
        expect(output).toContain('Field hints: taskId: No task matches this id')
        expect(output).toContain(
            'Try next: Confirm the referenced IDs exist and are accessible, then retry.',
        )
    })

    it('extracts HTTP status from generic API error messages', () => {
        const output = formatToolExecutionError(new Error('HTTP 400: Bad Request'))

        expect(output).toContain('Todoist API request failed (HTTP 400).')
        expect(output).toContain('Message: HTTP 400: Bad Request')
        expect(output).toContain('Try next: Check parameter values and formats, then retry.')
    })

    it('redacts secret values in API errors', () => {
        const output = formatToolExecutionError({
            httpStatusCode: 401,
            responseData: {
                error: 'Unauthorized',
                details:
                    'Authorization: Bearer secret_token_123456789 and token=another_secret_value',
            },
        })

        expect(output).toContain('Todoist API request failed (HTTP 401).')
        expect(output).toContain('[REDACTED]')
        expect(output).not.toContain('secret_token_123456789')
        expect(output).not.toContain('another_secret_value')
    })

    it('keeps Zod validation errors unchanged', () => {
        const validationResult = z.object({ taskId: z.string() }).safeParse({ taskId: 123 })

        expect(validationResult.success).toBe(false)
        if (validationResult.success) {
            throw new Error('Expected Zod validation to fail')
        }

        expect(formatToolExecutionError(validationResult.error)).toBe(
            validationResult.error.message,
        )
    })

    it('returns non-API errors as plain messages', () => {
        expect(formatToolExecutionError(new Error('Simple failure'))).toBe('Simple failure')
    })

    it('does not mislabel generic errors with data payloads as API errors', () => {
        const error = Object.assign(new Error('Unexpected tool failure'), {
            data: { foo: 'bar' },
        })

        expect(formatToolExecutionError(error)).toBe('Unexpected tool failure')
    })
})
