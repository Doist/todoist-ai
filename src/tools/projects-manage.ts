import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool'
import { mapProject } from './shared'

const ArgsSchema = {
    id: z
        .string()
        .min(1)
        .optional()
        .describe(
            'The ID of the project to update. If provided, updates the project. If omitted, creates a new project.',
        ),
    name: z.string().min(1).describe('The name of the project.'),
}

const projectsManage = {
    name: 'projects-manage',
    description:
        'Add a new project or update an existing project. If id is provided, updates the project. If id is omitted, creates a new project.',
    parameters: ArgsSchema,
    async execute(args, client) {
        if (args.id) {
            // Update existing project
            const project = await client.updateProject(args.id, { name: args.name })
            return project
        }

        // Create new project
        const project = await client.addProject({ name: args.name })
        return mapProject(project)
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { projectsManage }
