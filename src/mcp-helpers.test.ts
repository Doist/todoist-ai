import { registerTool, stripEmailsFromObject, stripEmailsFromText } from './mcp-helpers.js'

describe('stripEmailsFromObject', () => {
    it.each([
        [
            { id: '1', name: 'John', email: 'john@example.com' },
            { id: '1', name: 'John' },
        ],
        [
            {
                collaborators: [
                    { id: '1', name: 'Alice', email: 'alice@example.com' },
                    { id: '2', name: 'Bob', email: 'bob@example.com' },
                ],
            },
            {
                collaborators: [
                    { id: '1', name: 'Alice' },
                    { id: '2', name: 'Bob' },
                ],
            },
        ],
        [
            { collaborators: [], totalCount: 0 },
            { collaborators: [], totalCount: 0 },
        ],
        [
            { level1: { level2: { user: { id: '1', email: 'deep@example.com', name: 'Deep' } } } },
            { level1: { level2: { user: { id: '1', name: 'Deep' } } } },
        ],
    ])('strips email fields from %j', (input, expected) => {
        expect(stripEmailsFromObject(input)).toEqual(expected)
    })

    it.each([null, undefined, 'string', 123, true])('preserves primitive value %p', (value) => {
        expect(stripEmailsFromObject(value)).toBe(value)
    })
})

describe('stripEmailsFromText', () => {
    it.each([
        ['• John (john@example.com) - ID: 123', '• John - ID: 123'],
        ['• Alice (alice@example.com)\n• Bob (bob@example.com)', '• Alice\n• Bob'],
        ['Contact at john@example.com', 'Contact at [email hidden]'],
        ['User (test@domain.com) and contact@another.org', 'User and [email hidden]'],
        ['Plain text without emails', 'Plain text without emails'],
        ['assigned to: user@example.com', 'assigned to: [email hidden]'],
        ['', ''],
    ])('transforms %j to %j', (input, expected) => {
        expect(stripEmailsFromText(input)).toBe(expected)
    })
})

describe('registerTool error path', () => {
    it('applies centralized API formatting in MCP callback errors', async () => {
        const registerToolMock = vi.fn()

        registerTool({
            tool: {
                name: 'test-tool',
                description: 'Test tool',
                parameters: {},
                outputSchema: {},
                annotations: {
                    readOnlyHint: true,
                    destructiveHint: false,
                    idempotentHint: true,
                },
                execute: async () => {
                    throw {
                        httpStatusCode: 500,
                        responseData: {
                            error: 'Internal API failure',
                        },
                    }
                },
            },
            server: {
                registerTool: registerToolMock,
            } as unknown as Parameters<typeof registerTool>[0]['server'],
            client: {} as Parameters<typeof registerTool>[0]['client'],
        })

        expect(registerToolMock).toHaveBeenCalledTimes(1)

        const callback = registerToolMock.mock.calls[0]?.[2] as (
            args: Record<string, unknown>,
            context: unknown,
        ) => Promise<{
            content: Array<{ text: string }>
            isError: boolean
        }>

        const output = await callback({}, {})

        expect(output.isError).toBe(true)
        expect(output.content[0]?.text).toContain('Todoist API request failed (HTTP 500).')
        expect(output.content[0]?.text).toContain(
            'Try next: Todoist API may be temporarily unavailable. Retry shortly.',
        )
    })
})
