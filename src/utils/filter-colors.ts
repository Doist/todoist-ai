/**
 * The Todoist Sync API filter commands use different color string keys than
 * the REST API's ColorKey enum in the TypeScript client. These remaps handle
 * the translation in both directions.
 */

// Write direction (REST API ColorKey → Sync API): used when sending filter commands.
export const FILTER_COLOR_REMAP: Record<string, string> = {
    turquoise: 'teal',
    gray: 'grey',
}

// Read direction (Sync API → REST API ColorKey): used when parsing filter responses.
export const FILTER_COLOR_READ_REMAP: Record<string, string> = {
    teal: 'turquoise',
    grey: 'gray',
}
