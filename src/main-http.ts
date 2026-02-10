#!/usr/bin/env node
/**
 * HTTP Server for Todoist MCP with configurable session timeout.
 *
 * This server provides an alternative to the hosted service at ai.todoist.net/mcp
 * with configurable session management to prevent frequent disconnections.
 *
 * Environment variables:
 * - TODOIST_API_KEY: Required. Your Todoist API key.
 * - TODOIST_BASE_URL: Optional. Custom Todoist API base URL.
 * - PORT: Optional. Server port (default: 3000).
 * - SESSION_TIMEOUT_MS: Optional. Session timeout in milliseconds (default: 1800000 = 30 minutes).
 *
 * @see https://github.com/Doist/todoist-ai/issues/239
 */
import { randomUUID } from 'node:crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import dotenv from 'dotenv'
import express, { type Request, type Response } from 'express'
import { getMcpServer } from './mcp-server.js'

dotenv.config({ quiet: true })

const PORT = Number.parseInt(process.env.PORT || '3000', 10)
const SESSION_TIMEOUT_MS = Number.parseInt(process.env.SESSION_TIMEOUT_MS || '1800000', 10) // 30 minutes default

type SessionInfo = {
    transport: StreamableHTTPServerTransport
    lastActivity: number
    timeoutId: NodeJS.Timeout
}

const sessions: Map<string, SessionInfo> = new Map()

function cleanupSession(sessionId: string): void {
    const session = sessions.get(sessionId)
    if (session) {
        clearTimeout(session.timeoutId)
        session.transport.close()
        sessions.delete(sessionId)
        console.error(`[Session] Cleaned up session ${sessionId} due to inactivity`)
    }
}

function refreshSessionTimeout(sessionId: string): void {
    const session = sessions.get(sessionId)
    if (session) {
        clearTimeout(session.timeoutId)
        session.lastActivity = Date.now()
        session.timeoutId = setTimeout(() => cleanupSession(sessionId), SESSION_TIMEOUT_MS)
    }
}

function main() {
    const baseUrl = process.env.TODOIST_BASE_URL
    const todoistApiKey = process.env.TODOIST_API_KEY

    if (!todoistApiKey) {
        console.error('Error: TODOIST_API_KEY environment variable is required')
        process.exit(1)
    }

    const app = express()
    app.use(express.json())

    // Health check endpoint
    app.get('/health', (_req: Request, res: Response) => {
        res.json({
            status: 'ok',
            activeSessions: sessions.size,
            sessionTimeoutMs: SESSION_TIMEOUT_MS,
        })
    })

    // MCP endpoint - POST for requests
    app.post('/mcp', async (req: Request, res: Response) => {
        const sessionId = req.headers['mcp-session-id'] as string | undefined

        try {
            if (sessionId && sessions.has(sessionId)) {
                // Existing session - refresh timeout and handle request
                const session = sessions.get(sessionId)
                if (session) {
                    refreshSessionTimeout(sessionId)
                    await session.transport.handleRequest(req, res, req.body)
                }
            } else if (!sessionId && isInitializeRequest(req.body)) {
                // New session initialization
                const transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (id) => {
                        const timeoutId = setTimeout(() => cleanupSession(id), SESSION_TIMEOUT_MS)
                        sessions.set(id, {
                            transport,
                            lastActivity: Date.now(),
                            timeoutId,
                        })
                        console.error(`[Session] New session initialized: ${id}`)
                    },
                })

                transport.onclose = () => {
                    if (transport.sessionId) {
                        const session = sessions.get(transport.sessionId)
                        if (session) {
                            clearTimeout(session.timeoutId)
                            sessions.delete(transport.sessionId)
                            console.error(`[Session] Session closed: ${transport.sessionId}`)
                        }
                    }
                }

                const server = getMcpServer({ todoistApiKey, baseUrl })
                await server.connect(transport)
                await transport.handleRequest(req, res, req.body)
            } else {
                res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32001,
                        message: 'Invalid session. Please reconnect to establish a new session.',
                    },
                    id: null,
                })
            }
        } catch (error) {
            console.error('[Error] Request handling failed:', error)
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            })
        }
    })

    // MCP endpoint - GET for SSE streams
    app.get('/mcp', async (req: Request, res: Response) => {
        const sessionId = req.headers['mcp-session-id'] as string

        if (!sessionId || !sessions.has(sessionId)) {
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32001,
                    message: 'Invalid or expired session. Please reconnect.',
                },
                id: null,
            })
            return
        }

        const session = sessions.get(sessionId)
        if (session) {
            refreshSessionTimeout(sessionId)
            await session.transport.handleRequest(req, res)
        }
    })

    // MCP endpoint - DELETE to close session
    app.delete('/mcp', async (req: Request, res: Response) => {
        const sessionId = req.headers['mcp-session-id'] as string

        if (!sessionId || !sessions.has(sessionId)) {
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32001,
                    message: 'Invalid session',
                },
                id: null,
            })
            return
        }

        const session = sessions.get(sessionId)
        if (session) {
            await session.transport.handleRequest(req, res)
        }
    })

    app.listen(PORT, () => {
        console.error(`Todoist MCP HTTP Server started on port ${PORT}`)
        console.error(
            `Session timeout: ${SESSION_TIMEOUT_MS}ms (${SESSION_TIMEOUT_MS / 60000} minutes)`,
        )
        console.error(`MCP endpoint: http://localhost:${PORT}/mcp`)
        console.error(`Health check: http://localhost:${PORT}/health`)
    })
}

main()
