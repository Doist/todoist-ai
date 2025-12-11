import type { TodoistApi } from '@doist/todoist-api-typescript'
import type { z } from 'zod'

type ExecuteResult<Output extends z.ZodRawShape> = Promise<{
    textContent?: string
    structuredContent?: z.infer<z.ZodObject<Output>>
}>

/**
 * Categorization of tool behavior for MCP annotation hints.
 *
 * - **readonly**: Tool only reads data, doesn't modify state (e.g., find-*, get-*, search)
 * - **additive**: Tool creates new resources but doesn't modify existing ones (e.g., add-*)
 * - **mutating**: Tool modifies or destroys existing data (e.g., update-*, delete-*, complete-*)
 */
type ToolMutability = 'readonly' | 'additive' | 'mutating'

/**
 * A Todoist tool that can be used in an MCP server or other conversational AI interfaces.
 */
type TodoistTool<Params extends z.ZodRawShape, Output extends z.ZodRawShape> = {
    /**
     * The name of the tool.
     */
    name: string

    /**
     * The description of the tool. This is important for the LLM to understand what the tool does,
     * and how to use it.
     */
    description: string

    /**
     * The schema of the parameters of the tool.
     *
     * This is used to validate the parameters of the tool, as well as to let the LLM know what the
     * parameters are.
     */
    parameters: Params

    /**
     * The schema of the output of the tool.
     *
     * This is used to describe the structured output format that the tool will return.
     */
    outputSchema: Output

    /**
     * The mutability level of this tool.
     *
     * This is used to generate appropriate MCP annotation hints (readOnlyHint, destructiveHint).
     */
    mutability: ToolMutability

    /**
     * The meta data of the tool.
     *
     * This is used to store additional information about the tool.
     */
    _meta?: Record<string, unknown>

    /**
     * The function that executes the tool.
     *
     * This is the main function that will be called when the tool is used.
     *
     * @param args - The arguments of the tool.
     * @param client - The Todoist API client used to make requests to the Todoist API.
     * @returns The result of the tool.
     */
    execute: (args: z.infer<z.ZodObject<Params>>, client: TodoistApi) => ExecuteResult<Output>
}

export type { TodoistTool, ToolMutability }
