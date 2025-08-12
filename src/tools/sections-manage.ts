import { z } from 'zod'
import { errorContent } from '../mcp-helpers'
import type { TodoistTool } from '../todoist-tool'

const ArgsSchema = {
    id: z
        .string()
        .min(1)
        .optional()
        .describe(
            'The ID of the section to update. If provided, updates the section. If omitted, creates a new section.',
        ),
    name: z.string().min(1).describe('The name of the section.'),
    projectId: z
        .string()
        .min(1)
        .optional()
        .describe(
            'The ID of the project to add the section to. Required when creating a new section (when id is not provided).',
        ),
}

const sectionsManage = {
    name: 'sections-manage',
    description:
        'Add a new section to a project or update an existing section. If id is provided, updates the section. If id is omitted, creates a new section (requires projectId).',
    parameters: ArgsSchema,
    async execute(args, client) {
        if (args.id) {
            // Update existing section
            const section = await client.updateSection(args.id, { name: args.name })
            return section
        }

        // Create new section - projectId is required
        if (!args.projectId) {
            return errorContent(
                'Error: projectId is required when creating a new section (when id is not provided).',
            )
        }

        const section = await client.addSection({
            name: args.name,
            projectId: args.projectId,
        })

        return section
    },
} satisfies TodoistTool<typeof ArgsSchema>

export { sectionsManage }
