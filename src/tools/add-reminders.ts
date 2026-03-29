import {
    type AddReminderArgs,
    LOCATION_TRIGGERS,
    REMINDER_DELIVERY_SERVICES,
} from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { countRemindersByType, mapReminder } from '../tool-helpers.js'
import { ReminderSchema as ReminderOutputSchema } from '../utils/output-schemas.js'
import { ToolNames } from '../utils/tool-names.js'

const MAX_REMINDERS_PER_OPERATION = 25

const RelativeReminderInputSchema = z.object({
    type: z.literal('relative'),
    taskId: z.string().min(1).describe('The ID of the task to set a reminder for.'),
    minuteOffset: z
        .number()
        .int()
        .min(0)
        .describe(
            'Minutes before the task due time to trigger the reminder. E.g., 30 for 30 minutes before, 60 for 1 hour before, 1440 for 1 day before.',
        ),
    service: z
        .enum(REMINDER_DELIVERY_SERVICES)
        .optional()
        .describe('Delivery method: "email" or "push" notification. Defaults to push.'),
})

const AbsoluteReminderInputSchema = z.object({
    type: z.literal('absolute'),
    taskId: z.string().min(1).describe('The ID of the task to set a reminder for.'),
    due: z
        .object({
            date: z
                .string()
                .optional()
                .describe('Due date in YYYY-MM-DD format, e.g. "2025-12-31".'),
            string: z
                .string()
                .optional()
                .describe('Natural language due string, e.g. "tomorrow at 3pm".'),
            timezone: z
                .string()
                .optional()
                .describe('Timezone for the reminder, e.g. "America/New_York".'),
            lang: z.string().optional().describe('Language for parsing the due string, e.g. "en".'),
        })
        .describe('The specific date/time for the reminder.'),
    service: z
        .enum(REMINDER_DELIVERY_SERVICES)
        .optional()
        .describe('Delivery method: "email" or "push" notification. Defaults to push.'),
})

const LocationReminderInputSchema = z.object({
    type: z.literal('location'),
    taskId: z.string().min(1).describe('The ID of the task to set a reminder for.'),
    name: z.string().min(1).describe('Name of the location, e.g. "Office", "Home".'),
    locLat: z.string().describe('Latitude of the location as a string, e.g. "37.7749".'),
    locLong: z.string().describe('Longitude of the location as a string, e.g. "-122.4194".'),
    locTrigger: z
        .enum(LOCATION_TRIGGERS)
        .describe('When to trigger: "on_enter" (arriving) or "on_leave" (departing).'),
    radius: z
        .number()
        .int()
        .optional()
        .describe('Radius in meters for the geofence. Defaults to server default.'),
})

const ReminderInputSchema = z.discriminatedUnion('type', [
    RelativeReminderInputSchema,
    AbsoluteReminderInputSchema,
    LocationReminderInputSchema,
])

const ArgsSchema = {
    reminders: z
        .array(ReminderInputSchema)
        .min(1)
        .max(MAX_REMINDERS_PER_OPERATION)
        .describe(
            `Array of reminders to create (max ${MAX_REMINDERS_PER_OPERATION}). Each reminder must specify a type: "relative" (minutes before due), "absolute" (specific date/time), or "location" (geofence trigger).`,
        ),
}

const OutputSchema = {
    reminders: z.array(ReminderOutputSchema).describe('The created reminders.'),
    totalCount: z.number().describe('Total number of reminders created.'),
    addedReminderIds: z.array(z.string()).describe('IDs of the created reminders.'),
}

const addReminders = {
    name: ToolNames.ADD_REMINDERS,
    description:
        'Add reminders to tasks. Supports three types: "relative" (minutes before due), "absolute" (specific date/time), or "location" (geofence-triggered). Each reminder must specify a taskId.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async execute(args, client) {
        const { reminders } = args

        const addReminderPromises = reminders.map(async (reminder) => {
            switch (reminder.type) {
                case 'relative':
                    return await client.addReminder({
                        taskId: reminder.taskId,
                        reminderType: 'relative',
                        minuteOffset: reminder.minuteOffset,
                        service: reminder.service,
                    } as AddReminderArgs)
                case 'absolute':
                    return await client.addReminder({
                        taskId: reminder.taskId,
                        reminderType: 'absolute',
                        due: reminder.due,
                        service: reminder.service,
                    } as AddReminderArgs)
                case 'location':
                    return await client.addLocationReminder({
                        taskId: reminder.taskId,
                        name: reminder.name,
                        locLat: reminder.locLat,
                        locLong: reminder.locLong,
                        locTrigger: reminder.locTrigger,
                        radius: reminder.radius,
                    })
            }
        })

        const newReminders = await Promise.all(addReminderPromises)
        const mappedReminders = newReminders.map(mapReminder)
        const textContent = generateTextContent(mappedReminders)

        return {
            textContent,
            structuredContent: {
                reminders: mappedReminders,
                totalCount: mappedReminders.length,
                addedReminderIds: mappedReminders.map((r) => r.id),
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

function generateTextContent(reminders: ReturnType<typeof mapReminder>[]): string {
    const { timeBasedCount, locationCount } = countRemindersByType(reminders)

    const parts: string[] = []
    if (timeBasedCount > 0) {
        const label = timeBasedCount > 1 ? 'reminders' : 'reminder'
        parts.push(`${timeBasedCount} time-based ${label}`)
    }
    if (locationCount > 0) {
        const label = locationCount > 1 ? 'reminders' : 'reminder'
        parts.push(`${locationCount} location ${label}`)
    }

    return parts.length > 0 ? `Added ${parts.join(' and ')}` : 'No reminders added'
}

export { addReminders }
