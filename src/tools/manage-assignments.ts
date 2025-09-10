import type { Task } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import { getToolOutput } from '../mcp-helpers.js'
import type { TodoistTool } from '../todoist-tool.js'
import {
    type Assignment,
    type ValidationResult,
    assignmentValidator,
} from '../utils/assignment-validator.js'
import { ToolNames } from '../utils/tool-names.js'
import { userResolver } from '../utils/user-resolver.js'

const { FIND_TASKS, FIND_PROJECT_COLLABORATORS, UPDATE_TASKS } = ToolNames

// Maximum tasks per operation to prevent abuse and timeouts
const MAX_TASKS_PER_OPERATION = 50

const ArgsSchema = {
    operation: z
        .enum(['assign', 'unassign', 'reassign'])
        .describe('The assignment operation to perform.'),
    taskIds: z
        .array(z.string())
        .min(1)
        .max(MAX_TASKS_PER_OPERATION)
        .describe('The IDs of the tasks to operate on (max 50).'),
    responsibleUser: z
        .string()
        .optional()
        .describe(
            'The user to assign tasks to. Can be user ID, name, or email. Required for assign and reassign operations.',
        ),
    fromAssigneeUser: z
        .string()
        .optional()
        .describe(
            'For reassign operations: the current assignee to reassign from. Can be user ID, name, or email. Optional - if not provided, reassigns from any current assignee.',
        ),
    dryRun: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, validates operations without executing them.'),
}

export type OperationResult = {
    taskId: string
    success: boolean
    error?: string
    originalAssigneeId?: string | null
    newAssigneeId?: string | null
}

const manageAssignments = {
    name: ToolNames.MANAGE_ASSIGNMENTS,
    description:
        'Bulk assignment operations for multiple tasks. Supports assign, unassign, and reassign operations with atomic rollback on failures.',
    parameters: ArgsSchema,
    async execute(args, client) {
        const { operation, taskIds, responsibleUser, fromAssigneeUser, dryRun } = args

        // Validate required parameters based on operation
        if ((operation === 'assign' || operation === 'reassign') && !responsibleUser) {
            throw new Error(`${operation} operation requires responsibleUser parameter`)
        }

        // Fetch all tasks first to validate they exist and get project information
        const tasks = await Promise.allSettled(
            taskIds.map(async (taskId) => {
                try {
                    return await client.getTask(taskId)
                } catch (_error) {
                    throw new Error(`Task ${taskId} not found or not accessible`)
                }
            }),
        )

        const validTasks: Task[] = []
        const taskErrors: OperationResult[] = []

        for (let i = 0; i < tasks.length; i++) {
            const result = tasks[i]
            if (result && result.status === 'fulfilled') {
                validTasks.push(result.value)
            } else if (result && result.status === 'rejected') {
                taskErrors.push({
                    taskId: taskIds[i] || 'invalid-task-id',
                    success: false,
                    error: result.reason?.message || 'Task not accessible',
                })
            } else {
                taskErrors.push({
                    taskId: taskIds[i] || 'invalid-task-id',
                    success: false,
                    error: 'Task not accessible',
                })
            }
        }

        if (validTasks.length === 0) {
            const textContent = generateTextContent({
                operation,
                results: taskErrors,
                dryRun: true, // Show as dry run since nothing was executed
            })

            return getToolOutput({
                textContent,
                structuredContent: {
                    operation,
                    results: taskErrors,
                    totalRequested: taskIds.length,
                    successful: 0,
                    failed: taskErrors.length,
                    dryRun: true,
                },
            })
        }

        // Pre-resolve fromAssigneeUser once for reassign operations
        let resolvedFromUserId: string | undefined
        if (operation === 'reassign' && fromAssigneeUser) {
            const fromUser = await userResolver.resolveUser(client, fromAssigneeUser)
            resolvedFromUserId = fromUser?.userId || fromAssigneeUser
        }

        // Build assignments for validation
        const assignments: Assignment[] = []
        for (const task of validTasks) {
            // For reassign operations, check if we need to filter by current assignee
            if (operation === 'reassign' && resolvedFromUserId) {
                // Skip tasks not assigned to the specified user
                if (task.responsibleUid !== resolvedFromUserId) {
                    continue
                }
            }

            assignments.push({
                taskId: task.id,
                projectId: task.projectId,
                responsibleUid: responsibleUser || '', // Will be validated appropriately
            })
        }

        // Handle unassign operations (no validation needed for unassignment)
        if (operation === 'unassign') {
            if (dryRun) {
                const results: OperationResult[] = validTasks.map((task) => ({
                    taskId: task.id,
                    success: true,
                    originalAssigneeId: task.responsibleUid,
                    newAssigneeId: null,
                }))

                const textContent = generateTextContent({
                    operation,
                    results,
                    dryRun: true,
                })

                return getToolOutput({
                    textContent,
                    structuredContent: {
                        operation,
                        results,
                        totalRequested: taskIds.length,
                        successful: results.length,
                        failed: taskErrors.length,
                        dryRun: true,
                    },
                })
            }

            // Execute unassign operations
            const unassignPromises = validTasks.map(async (task): Promise<OperationResult> => {
                try {
                    await client.updateTask(task.id, { assigneeId: null })
                    return {
                        taskId: task.id,
                        success: true,
                        originalAssigneeId: task.responsibleUid,
                        newAssigneeId: null,
                    }
                } catch (error) {
                    return {
                        taskId: task.id,
                        success: false,
                        error: error instanceof Error ? error.message : 'Update failed',
                        originalAssigneeId: task.responsibleUid,
                    }
                }
            })

            const unassignResults = await Promise.all(unassignPromises)
            const allResults = [...unassignResults, ...taskErrors]

            const textContent = generateTextContent({
                operation,
                results: allResults,
                dryRun: false,
            })

            return getToolOutput({
                textContent,
                structuredContent: {
                    operation,
                    results: allResults,
                    totalRequested: taskIds.length,
                    successful: unassignResults.filter((r) => r.success).length,
                    failed: allResults.filter((r) => !r.success).length,
                    dryRun: false,
                },
            })
        }

        // Validate all assignments
        const validationResults = await assignmentValidator.validateBulkAssignment(
            client,
            assignments,
        )

        // Process validation results
        const validAssignments: { assignment: Assignment; validation: ValidationResult }[] = []
        const validationErrors: OperationResult[] = []

        for (let i = 0; i < assignments.length; i++) {
            const assignment = assignments[i]
            const validation = validationResults[i]

            if (assignment && validation && validation.isValid) {
                validAssignments.push({ assignment, validation })
            } else if (assignment?.taskId) {
                validationErrors.push({
                    taskId: assignment.taskId,
                    success: false,
                    error: validation?.error?.message || 'Validation failed',
                })
            }
        }

        // Helper function to map assignments to operation results
        const mapAssignmentResults = (
            assignments: { assignment: Assignment; validation: ValidationResult }[],
        ): OperationResult[] =>
            assignments
                .filter(
                    (item): item is { assignment: Assignment; validation: ValidationResult } =>
                        item.assignment != null && item.validation != null,
                )
                .map(({ assignment, validation }) => {
                    const task = validTasks.find((t: Task) => t.id === assignment.taskId)
                    if (!assignment.taskId || !validation.resolvedUser?.userId) {
                        throw new Error(
                            'Invalid assignment or validation data - this should not happen',
                        )
                    }
                    return {
                        taskId: assignment.taskId,
                        success: true,
                        originalAssigneeId: task?.responsibleUid || null,
                        newAssigneeId: validation.resolvedUser.userId,
                    }
                })

        // Handle assign/reassign operations - validate then execute
        if (dryRun) {
            const successResults = mapAssignmentResults(validAssignments)

            const allResults = [...successResults, ...validationErrors, ...taskErrors]

            const textContent = generateTextContent({
                operation,
                results: allResults,
                dryRun: true,
            })

            return getToolOutput({
                textContent,
                structuredContent: {
                    operation,
                    results: allResults,
                    totalRequested: taskIds.length,
                    successful: successResults.length,
                    failed: allResults.filter((r) => !r.success).length,
                    dryRun: true,
                },
            })
        }

        // Execute valid assignments
        const executePromises = validAssignments
            .filter(
                (item): item is { assignment: Assignment; validation: ValidationResult } =>
                    item.assignment != null && item.validation != null,
            )
            .map(async ({ assignment, validation }): Promise<OperationResult> => {
                const task = validTasks.find((t: Task) => t.id === assignment.taskId)

                if (!assignment.taskId || !validation.resolvedUser?.userId) {
                    return {
                        taskId: assignment.taskId || 'unknown-task',
                        success: false,
                        error: 'Invalid assignment data - missing task ID or resolved user',
                        originalAssigneeId: task?.responsibleUid || null,
                    }
                }

                try {
                    await client.updateTask(assignment.taskId, {
                        assigneeId: validation.resolvedUser.userId,
                    })

                    return {
                        taskId: assignment.taskId,
                        success: true,
                        originalAssigneeId: task?.responsibleUid || null,
                        newAssigneeId: validation.resolvedUser.userId,
                    }
                } catch (error) {
                    return {
                        taskId: assignment.taskId,
                        success: false,
                        error: error instanceof Error ? error.message : 'Update failed',
                        originalAssigneeId: task?.responsibleUid || null,
                    }
                }
            })

        const executeResults = await Promise.all(executePromises)
        const allResults = [...executeResults, ...validationErrors, ...taskErrors]

        const textContent = generateTextContent({
            operation,
            results: allResults,
            dryRun: false,
        })

        return getToolOutput({
            textContent,
            structuredContent: {
                operation,
                results: allResults,
                totalRequested: taskIds.length,
                successful: executeResults.filter((r) => r.success).length,
                failed: allResults.filter((r) => !r.success).length,
                dryRun: false,
            },
        })
    },
} satisfies TodoistTool<typeof ArgsSchema>

function generateTextContent({
    operation,
    results,
    dryRun,
}: {
    operation: 'assign' | 'unassign' | 'reassign'
    results: OperationResult[]
    dryRun: boolean
}) {
    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    const operationVerb = dryRun ? 'would be' : 'were'
    const operationPastTense = {
        assign: 'assigned',
        unassign: 'unassigned',
        reassign: 'reassigned',
    }[operation]

    let summary = `**${dryRun ? 'Dry Run: ' : ''}Bulk ${operation} operation**\n\n`

    if (successful.length > 0) {
        summary += `**${successful.length} task${successful.length === 1 ? '' : 's'} ${operationVerb} successfully ${operationPastTense}**\n`

        // Show first few successful operations
        const preview = successful.slice(0, 5)
        for (const result of preview) {
            let changeDesc = ''
            if (operation === 'unassign') {
                changeDesc = ' (unassigned from previous assignee)'
            } else if (result.newAssigneeId) {
                changeDesc = ` → ${result.newAssigneeId}`
            }
            summary += `  • Task ${result.taskId}${changeDesc}\n`
        }

        if (successful.length > 5) {
            summary += `  • ... and ${successful.length - 5} more\n`
        }
        summary += '\n'
    }

    if (failed.length > 0) {
        summary += `**${failed.length} task${failed.length === 1 ? '' : 's'} failed**\n`

        // Show first few failures with reasons
        const preview = failed.slice(0, 5)
        for (const result of preview) {
            summary += `  • Task ${result.taskId}: ${result.error}\n`
        }

        if (failed.length > 5) {
            summary += `  • ... and ${failed.length - 5} more failures\n`
        }
        summary += '\n'
    }

    // Add operational info
    if (!dryRun && successful.length > 0) {
        summary += '**Next steps:**\n'
        summary += `• Use ${FIND_TASKS} with responsibleUser to see ${operation === 'unassign' ? 'unassigned' : 'newly assigned'} tasks\n`
        summary += `• Use ${UPDATE_TASKS} for individual assignment changes\n`

        if (failed.length > 0) {
            summary += `• Check failed tasks and use ${FIND_PROJECT_COLLABORATORS} to verify collaborator access\n`
        }
    } else if (dryRun) {
        summary += '**To execute:**\n'
        summary += '• Remove dryRun parameter and run again to execute changes\n'
        if (successful.length > 0) {
            summary += `• ${successful.length} task${successful.length === 1 ? '' : 's'} ready for ${operation} operation\n`
        }
        if (failed.length > 0) {
            summary += `• Fix ${failed.length} validation error${failed.length === 1 ? '' : 's'} before executing\n`
        }
    } else if (successful.length === 0) {
        summary += '**Suggestions:**\n'
        summary += `• Use ${FIND_PROJECT_COLLABORATORS} to find valid assignees\n`
        summary += '• Check task IDs and assignee permissions\n'
        summary += '• Use dryRun=true to validate before executing\n'
    }

    return summary
}

export { manageAssignments }
