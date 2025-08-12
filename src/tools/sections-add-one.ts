import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'

const ArgsSchema = {
    name: z.string().min(1).describe('The name of the section to add.'),
    projectId: z.string().min(1).describe('The ID of the project to add the section to.'),
}

const sectionsAddOne = {
    name: 'sections-add-one',
    description: 'Add a new section to a project.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const section = await client.addSection({
            name: args.name,
            projectId: args.projectId,
        })
        return section
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { sectionsAddOne }
