#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import dotenv from 'dotenv'
import type { Request, Response } from 'express'
import express from 'express'
import { getMcpServer } from './mcp-server.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000
const TODOIST_BASE_URL = process.env.TODOIST_BASE_URL
const USE_HTTPS = process.env.USE_HTTPS === 'true'
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH

// Store active transports by session ID
const transports = new Map<string, SSEServerTransport>()

/**
 * Extract Todoist API token from request headers.
 * Supports both X-Todoist-Token header and Authorization Bearer token.
 */
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

/**
 * GET /sse - Establish SSE connection for a user
 */
app.get('/sse', async (req: Request, res: Response) => {
    try {
        // Extract Todoist API token from headers
        const todoistApiKey = extractTodoistToken(req)

        if (!todoistApiKey) {
            res.status(401).json({
                error: 'Missing Todoist API token',
                message:
                    'Please provide a Todoist API token via X-Todoist-Token header or Authorization: Bearer <token>',
            })
            return
        }

        // Check if LibreChat didn't substitute the customUserVar
        if (todoistApiKey.includes('{{') || todoistApiKey.includes('}}')) {
            console.error(
                '[ERROR] LibreChat customUserVars not substituted - received template variable instead of token',
            )
            res.status(401).json({
                error: 'Configuration error',
                message:
                    'LibreChat customUserVars not working. The template variable was not substituted. Please check your LibreChat configuration and ensure the user has entered their Todoist API token.',
            })
            return
        }

        // Create per-user MCP server instance
        const server = getMcpServer({ todoistApiKey, baseUrl: TODOIST_BASE_URL })

        // Create SSE transport
        const transport = new SSEServerTransport('/message', res)

        console.error('[INFO] SSE connection established, MCP handshake starting...')

        // Store transport by session ID for routing POST messages
        transports.set(transport.sessionId, transport)

        // Clean up on connection close
        transport.onclose = () => {
            transports.delete(transport.sessionId)
        }

        transport.onerror = (error: Error) => {
            console.error(`SSE transport error:`, error.message)
            transports.delete(transport.sessionId)
        }

        // Connect server to transport (this automatically starts the SSE stream)
        await server.connect(transport)
    } catch (error) {
        console.error('Error establishing SSE connection:', error)
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            })
        }
    }
})

/**
 * POST /message - Receive messages from MCP client
 * The sessionId is provided as a query parameter by the client
 */
app.post('/message', express.json(), async (req: Request, res: Response) => {
    try {
        const sessionId = req.query.sessionId as string

        if (!sessionId) {
            res.status(400).json({
                error: 'Missing sessionId',
                message: 'sessionId query parameter is required',
            })
            return
        }

        const transport = transports.get(sessionId)

        if (!transport) {
            res.status(404).json({
                error: 'Session not found',
                message: `No active session found for sessionId: ${sessionId}`,
            })
            return
        }

        // Handle the POST message
        await transport.handlePostMessage(req, res, req.body)
    } catch (error) {
        console.error('Error handling POST message:', error)
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            })
        }
    }
})

/**
 * GET / - Health check endpoint
 */
app.get('/', (_req: Request, res: Response) => {
    res.json({
        name: 'Todoist MCP SSE Server',
        version: '4.14.0',
        status: 'running',
        endpoints: {
            sse: '/sse',
            message: '/message',
        },
        activeSessions: transports.size,
    })
})

/**
 * Start the Express server (HTTP or HTTPS based on configuration)
 */
function main() {
    if (USE_HTTPS) {
        // HTTPS mode
        if (!HTTPS_KEY_PATH || !HTTPS_CERT_PATH) {
            console.error('[ERROR] HTTPS enabled but HTTPS_KEY_PATH or HTTPS_CERT_PATH not set')
            process.exit(1)
        }

        try {
            const httpsOptions = {
                key: readFileSync(HTTPS_KEY_PATH),
                cert: readFileSync(HTTPS_CERT_PATH),
            }

            const httpsServer = createHttpsServer(httpsOptions, app)
            httpsServer.listen(PORT, () => {
                console.error(`Todoist MCP SSE Server running on port ${PORT} (HTTPS)`)
                console.error(`SSE endpoint: https://localhost:${PORT}/sse`)
            })
        } catch (error) {
            console.error('[ERROR] Failed to start HTTPS server:', error)
            process.exit(1)
        }
    } else {
        // HTTP mode (default)
        const httpServer = createHttpServer(app)
        httpServer.listen(PORT, () => {
            console.error(`Todoist MCP SSE Server running on port ${PORT} (HTTP)`)
            console.error(`SSE endpoint: http://localhost:${PORT}/sse`)
        })
    }
}

main()
