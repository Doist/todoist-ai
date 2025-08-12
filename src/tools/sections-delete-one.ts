import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'

const ArgsSchema = {
    id: z.string().min(1).describe('The ID of the section to delete.'),
}

const sectionsDeleteOne = {
    name: 'sections-delete-one',
    description: 'Delete a section by its ID.',
    parameters: ArgsSchema,
    async execute(args, client) {
        await client.deleteSection(args.id)
        return { success: true }
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { sectionsDeleteOne }
