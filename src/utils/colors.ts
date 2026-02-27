import { colors } from '@doist/todoist-api-typescript'
import { z } from 'zod'

const colorKeys = colors.map((c) => c.key) as [string, ...string[]]

function normalizeColor(val: unknown): string | undefined {
    if (typeof val !== 'string') return undefined
    const lower = val.toLowerCase()
    const found =
        colors.find((c) => c.key === lower) ??
        colors.find((c) => c.displayName.toLowerCase() === lower)
    return found?.key // undefined if not recognized
}

const colorDescription =
    'Color for the entity. Accepts a color key (e.g. "berry_red") or display name (e.g. "Berry Red"). ' +
    `Valid colors: ${colorKeys.join(', ')}. ` +
    'Unrecognized colors are omitted and charcoal will be used as the default.'

// For INPUT: normalizes key or display name → canonical key (or undefined if unrecognized)
export const ColorSchema = z
    .preprocess(normalizeColor, z.enum(colorKeys).optional())
    .describe(colorDescription)

// For OUTPUT: plain enum describing valid color keys returned by the API
export const ColorKeySchema = z.enum(colorKeys).describe('The color key of the entity.')
