import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'

const ArgsSchema = {
    id: z.string().min(1).describe('The ID of the section to update.'),
    name: z.string().min(1).describe('The new name for the section.'),
}

const sectionsUpdateOne = {
    name: 'sections-update-one',
    description: "Update a section's name by its ID.",
    parameters: ArgsSchema,
    async execute(args, client) {
        const { id, name } = args
        const section = await client.updateSection(id, { name })
        return section
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { sectionsUpdateOne }
