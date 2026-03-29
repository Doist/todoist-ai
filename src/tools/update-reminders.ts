import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { mapReminder } from '../tool-helpers.js'
import { ReminderSchema as ReminderOutputSchema } from '../utils/output-schemas.js'
import { ToolNames } from '../utils/tool-names.js'

const RelativeReminderUpdateSchema = z.object({
    type: z.literal('relative'),
    id: z.string().min(1).describe('The ID of the relative reminder to update.'),
    minuteOffset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('New minute offset before task due time.'),
    service: z
        .enum(['email', 'push'])
        .optional()
        .describe('New delivery method: "email" or "push".'),
})

const AbsoluteReminderUpdateSchema = z.object({
    type: z.literal('absolute'),
    id: z.string().min(1).describe('The ID of the absolute reminder to update.'),
    due: z
        .object({
            date: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
            string: z.string().optional().describe('Natural language due string.'),
            timezone: z.string().optional().describe('Timezone for the reminder.'),
            lang: z.string().optional().describe('Language for parsing the due string.'),
        })
        .optional()
        .describe('New due date/time for the reminder.'),
    service: z
        .enum(['email', 'push'])
        .optional()
        .describe('New delivery method: "email" or "push".'),
})

const LocationReminderUpdateSchema = z.object({
    type: z.literal('location'),
    id: z.string().min(1).describe('The ID of the location reminder to update.'),
    name: z.string().optional().describe('New location name.'),
    locLat: z.string().optional().describe('New latitude.'),
    locLong: z.string().optional().describe('New longitude.'),
    locTrigger: z
        .enum(['on_enter', 'on_leave'])
        .optional()
        .describe('New trigger condition: "on_enter" or "on_leave".'),
    radius: z.number().int().optional().describe('New radius in meters.'),
})

const ReminderUpdateSchema = z.discriminatedUnion('type', [
    RelativeReminderUpdateSchema,
    AbsoluteReminderUpdateSchema,
    LocationReminderUpdateSchema,
])

const ArgsSchema = {
    reminders: z
        .array(ReminderUpdateSchema)
        .min(1)
        .describe(
            'Array of reminders to update. Each must include the reminder type and ID. Only include fields that need to change.',
        ),
}

const OutputSchema = {
    reminders: z.array(ReminderOutputSchema).describe('The updated reminders.'),
    totalCount: z.number().describe('Total reminders updated.'),
    updatedReminderIds: z.array(z.string()).describe('IDs of updated reminders.'),
}

const updateReminders = {
    name: ToolNames.UPDATE_REMINDERS,
    description:
        'Update existing reminders. Each reminder must specify its type ("relative", "absolute", or "location") and ID. Only include fields that need to change.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    async execute(args, client) {
        const { reminders } = args

        const updatePromises = reminders.map(async (reminder) => {
            switch (reminder.type) {
                case 'relative': {
                    const { id, type: _, ...updateArgs } = reminder
                    return await client.updateReminder(id, {
                        reminderType: 'relative',
                        ...updateArgs,
                    })
                }
                case 'absolute': {
                    const { id, type: _, ...updateArgs } = reminder
                    return await client.updateReminder(id, {
                        reminderType: 'absolute',
                        ...updateArgs,
                    })
                }
                case 'location': {
                    const { id, type: _, ...updateArgs } = reminder
                    return await client.updateLocationReminder(id, updateArgs)
                }
            }
        })

        const updatedReminders = await Promise.all(updatePromises)
        const mappedReminders = updatedReminders.map(mapReminder)

        const label = mappedReminders.length === 1 ? 'reminder' : 'reminders'
        const textContent = `Updated ${mappedReminders.length} ${label}`

        return {
            textContent,
            structuredContent: {
                reminders: mappedReminders,
                totalCount: mappedReminders.length,
                updatedReminderIds: mappedReminders.map((r) => r.id),
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

export { updateReminders }
