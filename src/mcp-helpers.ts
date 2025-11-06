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
    textContent: string | undefined
    structuredContent: StructuredContent | undefined
}) {
    // Remove null fields from structured content before returning
    const sanitizedContent = removeNullFields(structuredContent)

    // Always include structuredContent when available since all tools have outputSchema
    const result: Record<string, unknown> = {}
    if (textContent) result.content = [{ type: 'text' as const, text: textContent }]
    if (structuredContent) result.structuredContent = sanitizedContent

    // Legacy support: also include JSON in content when USE_STRUCTURED_CONTENT is false
    if (!USE_STRUCTURED_CONTENT && structuredContent) {
        const json = JSON.stringify(sanitizedContent)
        if (!result.content) {
            result.content = []
        }
        ;(result.content as Array<{ type: 'text'; text: string; mimeType?: string }>).push({
            type: 'text',
            mimeType: 'application/json',
            text: json,
        })
    }

    return result
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
function registerTool<Params extends z.ZodRawShape, Output extends z.ZodRawShape = z.ZodRawShape>(
    tool: TodoistTool<Params, Output>,
    server: McpServer,
    client: TodoistApi,
) {
    // @ts-expect-error I give up
    const cb: ToolCallback<Params> = async (
        args: z.objectOutputType<Params, ZodTypeAny>,
        _context,
    ) => {
        try {
            const { textContent, structuredContent } = await tool.execute(
                args as z.infer<z.ZodObject<Params>>,
                client,
            )
            return getToolOutput({ textContent, structuredContent })
        } catch (error) {
            console.error(`Error executing tool ${tool.name}:`, { args, error })
            const message = error instanceof Error ? error.message : 'An unknown error occurred'
            return getErrorOutput(message)
        }
    }

    // Use registerTool to support outputSchema
    server.registerTool(
        tool.name,
        {
            description: tool.description,
            inputSchema: tool.parameters,
            outputSchema: tool.outputSchema as Output,
        },
        cb,
    )
}

export { registerTool }
