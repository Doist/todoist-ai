import type { SyncCommand } from '@doist/todoist-api-typescript'
import { createCommand } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { ToolNames } from '../utils/tool-names.js'

const reorderableTypes = ['project', 'section'] as const

const ArgsSchema = {
    type: z
        .enum(reorderableTypes)
        .describe(
            'The type of entity to reorder. ' +
                '"project" reorders sibling projects within the same parent (and can move projects to a new parent). ' +
                '"section" reorders sections within the same project.',
        ),
    items: z
        .array(
            z.object({
                id: z.string().min(1).describe('The ID of the entity.'),
                order: z
                    .number()
                    .int()
                    .min(0)
                    .optional()
                    .describe(
                        'The new position/order value for the entity. Lower values appear first.',
                    ),
                parentId: z
                    .string()
                    .min(1)
                    .optional()
                    .describe(
                        'Move a project to be a sub-project of this parent project ID, or use "root" to move to the top level. ' +
                            'Only valid when type is "project".',
                    ),
            }),
        )
        .min(1)
        .describe(
            'The items to reorder or move. Each item must have at least order or parentId. ' +
                'Items with parentId will be moved first, then items with order will be reordered. ' +
                'All items being reordered should be siblings for predictable results.',
        ),
}

const OutputSchema = {
    type: z.enum(reorderableTypes).describe('The type of entity that was reordered/moved.'),
    movedCount: z.number().describe('The number of entities moved to a new parent.'),
    reorderedCount: z.number().describe('The number of entities reordered.'),
    affectedIds: z.array(z.string()).describe('The IDs of all affected entities.'),
    success: z.boolean().describe('Whether the operation was successful.'),
}

const reorderObjects = {
    name: ToolNames.REORDER_OBJECTS,
    description:
        'Reorder sibling projects or sections, and optionally move projects to a new parent. ' +
        'For projects: set order to reorder siblings, and/or set parentId to move under a new parent (use "root" for top level). ' +
        'For sections: set order to reorder within a project.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async execute(args, client) {
        const { type, items } = args

        for (const item of items) {
            if (item.order === undefined && item.parentId === undefined) {
                throw new Error(
                    `Item id=${item.id} must have at least one of "order" or "parentId".`,
                )
            }
            if (item.parentId !== undefined && type !== 'project') {
                throw new Error(
                    `parentId is only supported when type is "project", but type is "${type}".`,
                )
            }
        }

        const commands: SyncCommand[] = []

        // Project move commands first (so reordering applies to the new parent context)
        const itemsToMove = items.filter((item) => item.parentId !== undefined)
        for (const item of itemsToMove) {
            const parentId = item.parentId
            commands.push(
                createCommand('project_move', {
                    id: item.id,
                    parentId: parentId === 'root' ? null : parentId,
                }),
            )
        }

        // Reorder command for items with order values
        const itemsToReorder = items.filter(
            (item): item is typeof item & { order: number } => item.order !== undefined,
        )
        if (itemsToReorder.length > 0) {
            if (type === 'project') {
                commands.push(
                    createCommand('project_reorder', {
                        projects: itemsToReorder.map((item) => ({
                            id: item.id,
                            childOrder: item.order,
                        })),
                    }),
                )
            } else {
                commands.push(
                    createCommand('section_reorder', {
                        sections: itemsToReorder.map((item) => ({
                            id: item.id,
                            sectionOrder: item.order,
                        })),
                    }),
                )
            }
        }

        // The SDK throws TodoistRequestError if any syncStatus entry is non-ok,
        // so we catch and rethrow with contextual information.
        try {
            await client.sync({ commands })
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            throw new Error(`Reorder failed: ${message}`)
        }

        const entityLabel = type === 'project' ? 'projects' : 'sections'
        const affectedIds = items.map((item) => item.id)
        const parts: string[] = []
        if (itemsToMove.length > 0) {
            parts.push(`moved ${itemsToMove.length}`)
        }
        if (itemsToReorder.length > 0) {
            parts.push(`reordered ${itemsToReorder.length}`)
        }

        return {
            textContent: `${parts.join(' and ')} ${entityLabel}: ${affectedIds.map((id) => `id=${id}`).join(', ')}`,
            structuredContent: {
                type,
                movedCount: itemsToMove.length,
                reorderedCount: itemsToReorder.length,
                affectedIds,
                success: true,
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

export { reorderObjects }
