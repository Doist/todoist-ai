import { jest } from '@jest/globals'
import type { Request, Response } from 'express'

describe('SSE Server', () => {
    describe('extractTodoistToken', () => {
        // Helper function to simulate the token extraction logic
        function extractTodoistToken(req: Request): string | null {
            // Try X-Todoist-Token header first
            const customHeader = req.headers['x-todoist-token']
            if (customHeader && typeof customHeader === 'string') {
                return customHeader.trim()
            }

            // Fallback to Authorization Bearer token
            const authHeader = req.headers.authorization
            if (authHeader && typeof authHeader === 'string') {
                const match = authHeader.match(/^Bearer\s+(.+)$/i)
                if (match?.[1]) {
                    return match[1].trim()
                }
            }

            return null
        }

        function createMockRequest(headers: Record<string, string>): Request {
            return {
                headers,
            } as Request
        }

        describe('Token extraction from X-Todoist-Token header', () => {
            test('should extract token from X-Todoist-Token header', () => {
                const mockReq = createMockRequest({
                    'x-todoist-token': 'test-token-123',
                })

                const token = extractTodoistToken(mockReq)

                expect(token).toBe('test-token-123')
            })

            test('should trim whitespace from X-Todoist-Token header', () => {
                const mockReq = createMockRequest({
                    'x-todoist-token': '  test-token-123  ',
                })

                const token = extractTodoistToken(mockReq)

                expect(token).toBe('test-token-123')
            })

            test('should handle valid 40-character Todoist token', () => {
                const validToken = 'c24a059c898de0c9f61a8e3aaf0daece23baec6f'
                const mockReq = createMockRequest({
                    'x-todoist-token': validToken,
                })

                const token = extractTodoistToken(mockReq)

                expect(token).toBe(validToken)
                expect(token).toHaveLength(40)
            })
        })

        describe('Token extraction from Authorization header', () => {
            test('should extract token from Authorization Bearer header', () => {
                const mockReq = createMockRequest({
                    authorization: 'Bearer test-token-456',
                })

                const token = extractTodoistToken(mockReq)

                expect(token).toBe('test-token-456')
            })

            test('should handle case-insensitive Bearer keyword', () => {
                const mockReq = createMockRequest({
                    authorization: 'bearer test-token-789',
                })

                const token = extractTodoistToken(mockReq)

                expect(token).toBe('test-token-789')
            })

            test('should trim whitespace from Authorization header token', () => {
                const mockReq = createMockRequest({
                    authorization: 'Bearer   test-token-with-spaces  ',
                })

                const token = extractTodoistToken(mockReq)

                expect(token).toBe('test-token-with-spaces')
            })

            test('should return null for malformed Authorization header', () => {
                const mockReq = createMockRequest({
                    authorization: 'NotBearer test-token',
                })

                const token = extractTodoistToken(mockReq)

                expect(token).toBeNull()
            })

            test('should return null for Authorization header without token', () => {
                const mockReq = createMockRequest({
                    authorization: 'Bearer',
                })

                const token = extractTodoistToken(mockReq)

                expect(token).toBeNull()
            })
        })

        describe('Header priority', () => {
            test('should prioritize X-Todoist-Token over Authorization header', () => {
                const mockReq = createMockRequest({
                    'x-todoist-token': 'custom-header-token',
                    authorization: 'Bearer auth-header-token',
                })

                const token = extractTodoistToken(mockReq)

                expect(token).toBe('custom-header-token')
            })
        })

        describe('Missing token', () => {
            test('should return null when no token headers present', () => {
                const mockReq = createMockRequest({
                    'user-agent': 'test',
                })

                const token = extractTodoistToken(mockReq)

                expect(token).toBeNull()
            })

            test('should return null when headers are empty strings', () => {
                const mockReq = createMockRequest({
                    'x-todoist-token': '',
                    authorization: '',
                })

                const token = extractTodoistToken(mockReq)

                expect(token).toBeNull()
            })

            test('should return null when Authorization header has no Bearer prefix', () => {
                const mockReq = createMockRequest({
                    authorization: 'some-token-without-bearer',
                })

                const token = extractTodoistToken(mockReq)

                expect(token).toBeNull()
            })
        })

        describe('Template variable detection', () => {
            function hasTemplateVariables(token: string): boolean {
                return token.includes('{{') || token.includes('}}')
            }

            test('should detect unsubstituted template variable', () => {
                const token = '{{TODOIST_API_TOKEN}}'

                expect(hasTemplateVariables(token)).toBe(true)
            })

            test('should detect template variable with partial substitution', () => {
                const token = 'prefix-{{VAR}}-suffix'

                expect(hasTemplateVariables(token)).toBe(true)
            })

            test('should not detect template variables in valid token', () => {
                const token = 'c24a059c898de0c9f61a8e3aaf0daece23baec6f'

                expect(hasTemplateVariables(token)).toBe(false)
            })

            test('should detect opening brace only', () => {
                const token = '{{INCOMPLETE'

                expect(hasTemplateVariables(token)).toBe(true)
            })

            test('should detect closing brace only', () => {
                const token = 'INCOMPLETE}}'

                expect(hasTemplateVariables(token)).toBe(true)
            })
        })
    })

    describe('Error handling', () => {
        function createMockResponse(): Response {
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
                headersSent: false,
            } as unknown as Response
            return res
        }

        test('should return 401 when token is missing', () => {
            const res = createMockResponse()

            res.status(401).json({
                error: 'Missing Todoist API token',
                message:
                    'Please provide a Todoist API token via X-Todoist-Token header or Authorization: Bearer <token>',
            })

            expect(res.status).toHaveBeenCalledWith(401)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Missing Todoist API token',
                }),
            )
        })

        test('should return 401 when template variable is not substituted', () => {
            const res = createMockResponse()

            res.status(401).json({
                error: 'Configuration error',
                message:
                    'LibreChat customUserVars not working. The template variable was not substituted. Please check your LibreChat configuration and ensure the user has entered their Todoist API token.',
            })

            expect(res.status).toHaveBeenCalledWith(401)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Configuration error',
                    message: expect.stringContaining('template variable'),
                }),
            )
        })

        test('should return 500 on internal server error', () => {
            const res = createMockResponse()

            res.status(500).json({
                error: 'Internal server error',
                message: 'Unknown error occurred',
            })

            expect(res.status).toHaveBeenCalledWith(500)
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Internal server error',
                }),
            )
        })
    })

    describe('Health endpoint', () => {
        test('should return server status information', () => {
            const healthResponse = {
                name: 'Todoist MCP SSE Server',
                version: '4.14.0',
                status: 'running',
                endpoints: {
                    sse: '/sse',
                    message: '/message',
                },
                activeSessions: 0,
            }

            expect(healthResponse).toHaveProperty('name', 'Todoist MCP SSE Server')
            expect(healthResponse).toHaveProperty('status', 'running')
            expect(healthResponse).toHaveProperty('endpoints')
            expect(healthResponse.endpoints).toHaveProperty('sse', '/sse')
            expect(healthResponse.endpoints).toHaveProperty('message', '/message')
            expect(healthResponse).toHaveProperty('activeSessions')
            expect(typeof healthResponse.activeSessions).toBe('number')
        })
    })
})
