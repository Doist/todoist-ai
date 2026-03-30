import { LOCATION_TRIGGERS, REMINDER_DELIVERY_SERVICES } from '@doist/todoist-api-typescript'
import { z } from 'zod'

/**
 * Maximum number of reminders per add/update operation.
 */
export const MAX_REMINDERS_PER_OPERATION = 25

/**
 * Shared schema for reminder delivery service (email or push).
 */
export const ReminderServiceSchema = z.enum(REMINDER_DELIVERY_SERVICES)

/**
 * Shared schema for reminder due date input.
 */
export const ReminderDueInputSchema = z.object({
    date: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
    string: z.string().optional().describe('Natural language due string, e.g. "tomorrow at 3pm".'),
    timezone: z.string().optional().describe('Timezone for the reminder, e.g. "America/New_York".'),
    lang: z.string().optional().describe('Language for parsing the due string, e.g. "en".'),
})

/**
 * Shared schema for location trigger (on_enter or on_leave).
 */
export const LocationTriggerSchema = z.enum(LOCATION_TRIGGERS)
