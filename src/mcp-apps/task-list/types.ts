export type PriorityLevel = 'p1' | 'p2' | 'p3' | 'p4'

export type Task = {
    id: string
    content: string
    priority: PriorityLevel
}
