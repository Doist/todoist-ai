import { z } from 'zod'

/**
 * Schema for a mapped task object returned by tools
 */
const TaskSchema = z.object({
    id: z.string().describe('The unique ID of the task.'),
    content: z.string().describe('The task title/content.'),
    description: z.string().describe('The task description.'),
    dueDate: z.string().optional().describe('The due date of the task (ISO 8601 format).'),
    recurring: z
        .union([z.boolean(), z.string()])
        .describe('Whether the task is recurring, or the recurrence string.'),
    deadlineDate: z
        .string()
        .optional()
        .describe('The deadline date of the task (ISO 8601 format).'),
    priority: z.number().describe('The priority level (1-4, where 1 is highest priority).'),
    projectId: z.string().describe('The ID of the project this task belongs to.'),
    sectionId: z.string().optional().describe('The ID of the section this task belongs to.'),
    parentId: z.string().optional().describe('The ID of the parent task (for subtasks).'),
    labels: z.array(z.string()).describe('The labels attached to this task.'),
    duration: z.string().optional().describe('The duration of the task (e.g., "2h30m").'),
    responsibleUid: z
        .string()
        .optional()
        .describe('The UID of the user responsible for this task.'),
    assignedByUid: z.string().optional().describe('The UID of the user who assigned this task.'),
    checked: z.boolean().describe('Whether the task is checked/completed.'),
    completedAt: z.string().optional().describe('When the task was completed (ISO 8601 format).'),
})

/**
 * Schema for a mapped project object returned by tools
 */
const ProjectSchema = z.object({
    id: z.string().describe('The unique ID of the project.'),
    name: z.string().describe('The name of the project.'),
    color: z.string().describe('The color of the project.'),
    isFavorite: z.boolean().describe('Whether the project is marked as favorite.'),
    isShared: z.boolean().describe('Whether the project is shared.'),
    parentId: z.string().optional().describe('The ID of the parent project (for sub-projects).'),
    inboxProject: z.boolean().describe('Whether this is the inbox project.'),
    viewStyle: z.string().describe('The view style of the project (list, board, calendar).'),
})

/**
 * Schema for a section object returned by tools
 */
const SectionSchema = z.object({
    id: z.string().describe('The unique ID of the section.'),
    name: z.string().describe('The name of the section.'),
})

/**
 * Schema for a comment object returned by tools
 */
const CommentSchema = z.object({
    id: z.string().describe('The unique ID of the comment.'),
    taskId: z.string().optional().describe('The ID of the task this comment belongs to.'),
    projectId: z.string().optional().describe('The ID of the project this comment belongs to.'),
    content: z.string().describe('The content of the comment.'),
    postedAt: z.string().describe('When the comment was posted (ISO 8601 format).'),
    attachment: z.record(z.unknown()).optional().describe('Attachment information, if any.'),
})

/**
 * Schema for an activity event object returned by tools
 */
const ActivityEventSchema = z.object({
    id: z.string().describe('The unique ID of the activity event.'),
    objectType: z
        .string()
        .describe('The type of object this event relates to (task, project, etc).'),
    objectId: z.string().describe('The ID of the object this event relates to.'),
    eventType: z.string().describe('The type of event (added, updated, deleted, completed, etc).'),
    eventDate: z.string().describe('When the event occurred (ISO 8601 format).'),
    parentProjectId: z.string().optional().describe('The ID of the parent project.'),
    parentItemId: z.string().optional().describe('The ID of the parent item.'),
    initiatorId: z.string().optional().describe('The ID of the user who initiated this event.'),
    extraData: z.record(z.unknown()).describe('Additional event data.'),
})

/**
 * Schema for a user/collaborator object returned by tools
 */
const CollaboratorSchema = z.object({
    id: z.string().describe('The unique ID of the user.'),
    name: z.string().describe('The full name of the user.'),
    email: z.string().describe('The email address of the user.'),
})

/**
 * Schema for batch operation failure
 */
const FailureSchema = z.object({
    item: z.string().describe('The item that failed (usually an ID or identifier).'),
    error: z.string().describe('The error message.'),
    code: z.string().optional().describe('The error code, if available.'),
})

export {
    ActivityEventSchema,
    CollaboratorSchema,
    CommentSchema,
    FailureSchema,
    ProjectSchema,
    SectionSchema,
    TaskSchema,
}
