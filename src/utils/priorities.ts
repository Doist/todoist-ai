import { z } from 'zod'

const PRIORITY_VALUES = ['p1', 'p2', 'p3', 'p4'] as const
export type Priority = (typeof PRIORITY_VALUES)[number]

export const PrioritySchema = z.enum(PRIORITY_VALUES, {
    description: 'Task priority: p1 (highest), p2 (high), p3 (medium), p4 (lowest/default)',
})

export function convertPriorityToNumber(priority: Priority): number {
    // Todoist API uses inverse mapping: p1=4 (highest), p2=3, p3=2, p4=1 (lowest)
    const priorityMap = { p1: 4, p2: 3, p3: 2, p4: 1 }
    return priorityMap[priority]
}

export function convertNumberToPriority(priority: number): Priority | undefined {
    // Convert Todoist API numbers back to our enum
    const numberMap = { 4: 'p1', 3: 'p2', 2: 'p3', 1: 'p4' } as const
    return numberMap[priority as keyof typeof numberMap]
}

export function formatPriorityForDisplay(priority: number): string {
    // Convert inverted priority numbers to display format (P1, P2, P3, P4)
    // Input is now inverted: 1=highest, 2=high, 3=medium, 4=lowest
    const displayMap = { 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4' } as const
    return displayMap[priority as keyof typeof displayMap] || ''
}

export function invertPriorityForOutput(apiPriority: number): number {
    // Invert Todoist API priority values for user-friendly output
    // API: 1=lowest, 2=medium, 3=high, 4=highest
    // Output: 1=highest, 2=high, 3=medium, 4=lowest
    const inversionMap = { 4: 1, 3: 2, 2: 3, 1: 4 } as const
    return inversionMap[apiPriority as keyof typeof inversionMap] || apiPriority
}
