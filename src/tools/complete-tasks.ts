import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import { FailureSchema } from '../utils/output-schemas.js'
import { summarizeBatch } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const ArgsSchema = {
    ids: z.array(z.string().min(1)).min(1).describe('The IDs of the tasks to complete.'),
}

const OutputSchema = {
    completed: z.array(z.string()).describe('The IDs of successfully completed tasks.'),
    failures: z.array(FailureSchema).describe('Failed task completions with error details.'),
    totalRequested: z.number().describe('The total number of tasks requested to complete.'),
    successCount: z.number().describe('The number of successfully completed tasks.'),
    failureCount: z.number().describe('The number of failed task completions.'),
}

const completeTasks = {
    name: ToolNames.COMPLETE_TASKS,
    description: 'Complete one or more tasks by their IDs.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    async execute(args, client) {
        const completed: string[] = []
        const failures: Array<{ item: string; error: string; code?: string }> = []

        for (const id of args.ids) {
            try {
                await client.closeTask(id)
                completed.push(id)
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                failures.push({
                    item: id,
                    error: errorMessage,
                })
            }
        }

        const textContent = generateTextContent({
            completed,
            failures,
            args,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                completed,
                failures,
                totalRequested: args.ids.length,
                successCount: completed.length,
                failureCount: failures.length,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    completed,
    failures,
    args,
}: {
    completed: string[]
    failures: Array<{ item: string; error: string; code?: string }>
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
}) {
    return summarizeBatch({
        action: 'Completed tasks',
        success: completed.length,
        total: args.ids.length,
        successItems: completed,
        failures,
    })
}

export { completeTasks }
