import type { TodoistApi } from '@doist/todoist-api-typescript'
import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ZodTypeAny, z } from 'zod'
import type { TodoistTool } from './todoist-tool.js'

function textContent(text: string) {
    return {
        content: [{ type: 'text' as const, text }],
    }
}

function jsonContent(data: unknown) {
    return {
        content: [
            {
                type: 'text' as const,
                mimeType: 'application/json',
                text: JSON.stringify(data, null, 2),
            },
        ],
    }
}

function textOrJsonContent(data: unknown) {
    return typeof data === 'string' ? textContent(data) : jsonContent(data)
}

function errorContent(error: string) {
    return {
        ...textContent(error),
        isError: true,
    }
}

/**
 * Register a Todoist tool in an MCP server.
 * @param tool - The tool to register.
 * @param server - The server to register the tool on.
 * @param client - The Todoist API client to use to execute the tool.
 */
function registerTool<Params extends z.ZodRawShape>(
    tool: TodoistTool<Params>,
    server: McpServer,
    client: TodoistApi,
) {
    // @ts-ignore I give up
    const cb: ToolCallback<Params> = async (
        args: z.objectOutputType<Params, ZodTypeAny>,
        _context,
    ) => {
        try {
            const result = await tool.execute(args as z.infer<z.ZodObject<Params>>, client)
            return textOrJsonContent(result)
        } catch (error) {
            console.error(`Error executing tool ${tool.name}:`, {
                args,
                error,
            })
            const message = error instanceof Error ? error.message : 'An unknown error occurred'
            return errorContent(message)
        }
    }

    server.tool(tool.name, tool.description, tool.parameters, cb)
}

export { registerTool, errorContent }
