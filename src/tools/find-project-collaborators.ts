import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { type Project } from '../tool-helpers.js'
import { CollaboratorSchema } from '../utils/output-schemas.js'
import { summarizeList } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'
import { type ProjectCollaborator, userResolver } from '../utils/user-resolver.js'

const { FIND_PROJECTS, ADD_TASKS, UPDATE_TASKS } = ToolNames

const ArgsSchema = {
    projectId: z.string().min(1).describe('The ID of the project to search for collaborators in.'),
    searchTerm: z
        .string()
        .optional()
        .describe(
            'Search for a collaborator by name or email (partial and case insensitive match). If omitted, all collaborators in the project are returned.',
        ),
}

const OutputSchema = {
    collaborators: z.array(CollaboratorSchema).describe('The found collaborators.'),
    projectInfo: z
        .object({
            id: z.string().describe('The project ID.'),
            name: z.string().describe('The project name.'),
            isShared: z.boolean().describe('Whether the project is shared.'),
        })
        .optional()
        .describe('Information about the project.'),
    totalCount: z.number().describe('The total number of collaborators found.'),
    totalAvailable: z
        .number()
        .optional()
        .describe('The total number of available collaborators in the project.'),
    appliedFilters: z
        .record(z.string(), z.unknown())
        .describe('The filters that were applied to the search.'),
}

const findProjectCollaborators = {
    name: ToolNames.FIND_PROJECT_COLLABORATORS,
    description: 'Search for collaborators by name or other criteria in a project.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async execute(args, client) {
        const { projectId, searchTerm } = args

        // First, validate that the project exists and get basic info
        let projectName = projectId
        let project: Project
        try {
            project = await client.getProject(projectId)
            if (!project) {
                throw new Error(`Project with ID "${projectId}" not found or not accessible`)
            }
            projectName = project.name

            if (!project.isShared) {
                const textContent = `Project "${projectName}" is not shared and has no collaborators.\n\n**Next steps:**\n• Share the project to enable collaboration\n• Use ${ADD_TASKS} and ${UPDATE_TASKS} for assignment features once shared`

                return {
                    textContent,
                    structuredContent: {
                        collaborators: [],
                        projectInfo: {
                            id: projectId,
                            name: projectName,
                            isShared: false,
                        },
                        totalCount: 0,
                        appliedFilters: args,
                    },
                }
            }
        } catch (error) {
            throw new Error(
                `Failed to access project "${projectId}": ${error instanceof Error ? error.message : 'Unknown error'}`,
            )
        }

        // Get collaborators for the project
        const allCollaborators = await userResolver.getProjectCollaborators(client, projectId)

        if (allCollaborators.length === 0) {
            const textContent = `Project "${projectName}" has no collaborators or collaborator data is not accessible.\n\n**Next steps:**\n• Check project sharing settings\n• Ensure you have permission to view collaborators\n• Try refreshing or re-sharing the project`

            return {
                textContent,
                structuredContent: {
                    collaborators: [],
                    projectInfo: {
                        id: projectId,
                        name: projectName,
                        isShared: true,
                    },
                    totalCount: 0,
                    appliedFilters: args,
                },
            }
        }

        // Filter collaborators if search term provided
        let filteredCollaborators = allCollaborators
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase().trim()
            filteredCollaborators = allCollaborators.filter(
                (collaborator) =>
                    collaborator.name.toLowerCase().includes(searchLower) ||
                    collaborator.email.toLowerCase().includes(searchLower),
            )
        }

        const textContent = generateTextContent({
            collaborators: filteredCollaborators,
            projectName,
            searchTerm,
            totalAvailable: allCollaborators.length,
        })

        return {
            textContent,
            structuredContent: {
                collaborators: filteredCollaborators,
                projectInfo: {
                    id: projectId,
                    name: projectName,
                    isShared: true,
                },
                totalCount: filteredCollaborators.length,
                totalAvailable: allCollaborators.length,
                appliedFilters: args,
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

function generateTextContent({
    collaborators,
    projectName,
    searchTerm,
    totalAvailable,
}: {
    collaborators: ProjectCollaborator[]
    projectName: string
    searchTerm?: string
    totalAvailable: number
}) {
    const subject = searchTerm
        ? `Project collaborators matching "${searchTerm}"`
        : 'Project collaborators'

    const filterHints: string[] = []
    if (searchTerm) {
        filterHints.push(`matching "${searchTerm}"`)
    }
    filterHints.push(`in project "${projectName}"`)

    let previewLines: string[] = []
    if (collaborators.length > 0) {
        previewLines = collaborators.slice(0, 10).map((collaborator) => {
            const displayName = collaborator.name || 'Unknown Name'
            const email = collaborator.email || 'No email'
            return `• ${displayName} (${email}) - ID: ${collaborator.id}`
        })

        if (collaborators.length > 10) {
            previewLines.push(`... and ${collaborators.length - 10} more`)
        }
    }

    const zeroReasonHints: string[] = []
    if (collaborators.length === 0) {
        if (searchTerm) {
            zeroReasonHints.push(`No collaborators match "${searchTerm}"`)
            zeroReasonHints.push('Try a broader search term or check spelling')
            if (totalAvailable > 0) {
                zeroReasonHints.push(`${totalAvailable} collaborators available without filter`)
            }
        } else {
            zeroReasonHints.push('Project has no collaborators')
            zeroReasonHints.push('Share the project to add collaborators')
        }
    }

    const nextSteps: string[] = []
    if (collaborators.length > 0) {
        nextSteps.push(`Use ${ADD_TASKS} with responsibleUser to assign new tasks`)
        nextSteps.push(`Use ${UPDATE_TASKS} with responsibleUser to reassign existing tasks`)
        nextSteps.push('Use collaborator names, emails, or IDs for assignments')
    } else {
        nextSteps.push(`Use ${FIND_PROJECTS} to find other projects`)
        if (searchTerm && totalAvailable > 0) {
            nextSteps.push('Try searching without filters to see all collaborators')
        }
    }

    return summarizeList({
        subject,
        count: collaborators.length,
        filterHints,
        previewLines: previewLines.join('\n'),
        zeroReasonHints,
        nextSteps,
    })
}

export { findProjectCollaborators }
