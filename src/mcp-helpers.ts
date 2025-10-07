import type { TodoistApi } from '@doist/todoist-api-typescript'
import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ZodTypeAny, z } from 'zod'
import type { TodoistTool } from './todoist-tool.js'
import { removeNullFields } from './utils/sanitize-data.js'

/**
 * Wether to return the structured content directly, vs. in the `content` part of the output.
 *
 * The `structuredContent` part of the output is relatively new in the spec, and it's not yet
 * supported by all clients. This flag controls wether we return the structured content using this
 * new feature of the MCP protocol or not.
 *
 * If `false`, the `structuredContent` will be returned as stringified JSON in one of the `content`
 * parts.
 *
 * Eventually we should be able to remove this, and change the code to always work with the
 * structured content returned directly, once most or all MCP clients support it.
 */
const USE_STRUCTURED_CONTENT =
    process.env.USE_STRUCTURED_CONTENT === 'true' || process.env.NODE_ENV === 'test'

/**
 * Get the output payload for a tool, in the correct format expected by MCP client apps.
 *
 * @param textContent - The text content to return.
 * @param structuredContent - The structured content to return.
 * @returns The output payload.
 * @see USE_STRUCTURED_CONTENT - Wether to use the structured content feature of the MCP protocol.
 */
function getToolOutput<StructuredContent extends Record<string, unknown>>({
    textContent,
    structuredContent,
}: {
    textContent: string
    structuredContent: StructuredContent
}) {
    // Remove null fields from structured content before returning
    const sanitizedContent = removeNullFields(structuredContent)

    if (USE_STRUCTURED_CONTENT) {
        return {
            content: [{ type: 'text' as const, text: textContent }],
            structuredContent: sanitizedContent,
        }
    }

    const json = JSON.stringify(sanitizedContent)
    return {
        content: [
            { type: 'text' as const, text: textContent },
            { type: 'text' as const, mimeType: 'application/json', text: json },
        ],
    }
}

function getErrorOutput(error: string) {
    return {
        content: [{ type: 'text' as const, text: error }],
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
    // @ts-expect-error I give up
    const cb: ToolCallback<Params> = async (
        args: z.objectOutputType<Params, ZodTypeAny>,
        _context,
    ) => {
        try {
            const result = await tool.execute(args as z.infer<z.ZodObject<Params>>, client)
            return result
        } catch (error) {
            console.error(`Error executing tool ${tool.name}:`, {
                args,
                error,
            })
            const message = error instanceof Error ? error.message : 'An unknown error occurred'
            return getErrorOutput(message)
        }
    }

    server.tool(tool.name, tool.description, tool.parameters, cb)
}

export { registerTool, getErrorOutput, getToolOutput }
