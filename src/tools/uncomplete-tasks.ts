import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { FailureSchema } from '../utils/output-schemas.js'
import { summarizeBatch } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const ArgsSchema = {
    ids: z.array(z.string().min(1)).min(1).describe('The IDs of the tasks to uncomplete.'),
}

const OutputSchema = {
    uncompleted: z.array(z.string()).describe('The IDs of successfully uncompleted tasks.'),
    failures: z.array(FailureSchema).describe('Failed task uncompletion with error details.'),
    totalRequested: z.number().describe('The total number of tasks requested to uncomplete.'),
    successCount: z.number().describe('The number of successfully uncompleted tasks.'),
    failureCount: z.number().describe('The number of failed task uncompletions.'),
}

const uncompleteTasks = {
    name: ToolNames.UNCOMPLETE_TASKS,
    description: 'Uncomplete (reopen) one or more completed tasks by their IDs.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async execute(args, client) {
        const results = await Promise.allSettled(
            args.ids.map((id) => client.reopenTask(id).then(() => id)),
        )

        const uncompleted: string[] = []
        const failures: Array<{ item: string; error: string; code?: string }> = []

        for (let i = 0; i < results.length; i++) {
            const result = results[i]
            const id = args.ids[i]
            if (!result || !id) continue

            if (result.status === 'fulfilled') {
                uncompleted.push(result.value)
            } else {
                const errorMessage =
                    result.reason instanceof Error ? result.reason.message : 'Unknown error'
                failures.push({ item: id, error: errorMessage })
            }
        }

        const textContent = generateTextContent({
            uncompleted,
            failures,
            args,
        })

        return {
            textContent,
            structuredContent: {
                uncompleted,
                failures,
                totalRequested: args.ids.length,
                successCount: uncompleted.length,
                failureCount: failures.length,
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

function generateTextContent({
    uncompleted,
    failures,
    args,
}: {
    uncompleted: string[]
    failures: Array<{ item: string; error: string; code?: string }>
    args: z.infer<z.ZodObject<typeof ArgsSchema>>
}) {
    return summarizeBatch({
        action: 'Uncompleted tasks',
        success: uncompleted.length,
        total: args.ids.length,
        successItems: uncompleted,
        failures,
    })
}

export { uncompleteTasks }
