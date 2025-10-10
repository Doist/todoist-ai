#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import dotenv from 'dotenv'
import { getMcpServer } from './mcp-server.js'
import { initializeTelemetry, shutdownTelemetry } from './telemetry.js'

async function main() {
    const baseUrl = process.env.TODOIST_BASE_URL
    const todoistApiKey = process.env.TODOIST_API_KEY
    if (!todoistApiKey) {
        throw new Error('TODOIST_API_KEY is not set')
    }

    // Setup telemetry
    try {
        if (initializeTelemetry()) {
            const handleSignal = (signal: NodeJS.Signals) => {
                void (async () => {
                    try {
                        await shutdownTelemetry()
                    } finally {
                        process.kill(process.pid, signal)
                    }
                })()
            }

            process.once('SIGINT', handleSignal)
            process.once('SIGTERM', handleSignal)
            process.once('beforeExit', () => {
                void shutdownTelemetry()
            })
        }
    } catch (error) {
        console.error('Failed to initialize telemetry', error)
    }

    // Start server
    const server = getMcpServer({ todoistApiKey, baseUrl })
    const transport = new StdioServerTransport()
    try {
        await server.connect(transport)
        // Use console.error because standard I/O is being used for the MCP server communication.
        console.error('Server started')
    } catch (error) {
        console.error('Error starting the Todoist MCP server:', error)
        await shutdownTelemetry()
        process.exit(1)
    }
}

dotenv.config()
void main()
