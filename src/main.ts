#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import dotenv from 'dotenv'
import { getMcpServer } from './mcp-server.js'
import { getCredentials, hasCredentials } from './utils/keychain.js'

function getConfig(): { todoistApiKey: string; baseUrl?: string } {
    // Base URL always comes from environment variables (not sensitive)
    const baseUrl = process.env.TODOIST_BASE_URL
    
    // Try environment variable first
    const envApiKey = process.env.TODOIST_API_KEY
    if (envApiKey) {
        return { todoistApiKey: envApiKey, baseUrl }
    }
    
    // Fallback to keychain if no environment variable is set
    if (hasCredentials()) {
        const { apiKey } = getCredentials()
        return { todoistApiKey: apiKey, baseUrl }
    }
    
    // Neither environment variable nor keychain has the API key
    throw new Error(
        'TODOIST_API_KEY is not set as environment variable and no API key found in keychain. ' +
        'Either set TODOIST_API_KEY environment variable or run the setup script to store your API key in keychain.'
    )
}

function main() {
    const { todoistApiKey, baseUrl } = getConfig()
    const server = getMcpServer({ todoistApiKey, baseUrl })
    const transport = new StdioServerTransport()
    server
        .connect(transport)
        .then(() => {
            // We use console.error because standard I/O is being used for the MCP server communication.
            console.error('Server started')
        })
        .catch((error) => {
            console.error('Error starting the Todoist MCP server:', error)
            process.exit(1)
        })
}

dotenv.config()
main()
