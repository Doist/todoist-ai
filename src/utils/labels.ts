import { z } from 'zod'

const LABELS_OPERATORS = ['and', 'or'] as const
type LabelsOperator = (typeof LABELS_OPERATORS)[number]

export const LabelsSchema = {
    labels: z
        .string()
        .array()
        .optional()
        .default([])
        .describe('The labels to filter the tasks by. Each label should begin with an "@" symbol.'),
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
    const labelStr = labels.join(` ${operator} `)
    return `(${labelStr})`
}
