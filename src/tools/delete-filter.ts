import { createCommand } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { ToolNames } from '../utils/tool-names.js'

const ArgsSchema = {
    id: z.string().min(1).describe('The ID of the filter to delete.'),
}

const OutputSchema = {
    deletedFilter: z
        .object({
            id: z.string().describe('The ID of the deleted filter.'),
        })
        .describe('Information about the deleted filter.'),
    success: z.boolean().describe('Whether the deletion was successful.'),
}

const deleteFilter = {
    name: ToolNames.DELETE_FILTER,
    description: 'Delete a personal filter by its ID.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async execute(args, client) {
        await client.sync({
            commands: [createCommand('filter_delete', { id: args.id })],
        })

        return {
            textContent: `Deleted filter: id=${args.id}`,
            structuredContent: {
                deletedFilter: { id: args.id },
                success: true,
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

export { deleteFilter }
