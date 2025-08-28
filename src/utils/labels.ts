import { z } from 'zod'

const LABELS_OPERATORS = ['and', 'or'] as const
type LabelsOperator = (typeof LABELS_OPERATORS)[number]

export const LabelsSchema = {
    labels: z
        .string()
        .array()
        .optional()
        .default([])
        .describe('The labels to filter the tasks by. Do not include the "@" symbol prefix.'),
    labelsOperator: z
        .enum(LABELS_OPERATORS)
        .optional()
        .default('or')
        .describe(
            'The operator to use when filtering by labels. This will dictate whether a task has all labels, or some of them.',
        ),
}

export function generateLabelsFilter(labels: string[], labelOperator: LabelsOperator) {
    if (labels.length === 0) return ''
    const operator = labelOperator === 'and' ? ' & ' : ' | '
    // Add @ prefix to labels for Todoist API query
    const prefixedLabels = labels.map((label) => (label.startsWith('@') ? label : `@${label}`))
    const labelStr = prefixedLabels.join(` ${operator} `)
    return `(${labelStr})`
}
