import { z } from 'zod'

/**
 * An optional string schema that converts empty strings to `undefined`.
 * LLMs often send `""` for optional fields instead of omitting them,
 * which causes the Todoist API to reject the request.
 *
 * `.optional()` must be outermost so the field stays optional in `z.infer` output types.
 */
export function optionalString(description: string) {
    return z
        .string()
        .transform((v) => (v === '' ? undefined : v))
        .optional()
        .describe(description)
}
