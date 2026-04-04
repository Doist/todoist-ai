import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function isOverdue(dueDate: string | undefined): boolean {
  if (!dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dueDate) < today
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case 'p1': return 'text-red-400'
    case 'p2': return 'text-orange-400'
    case 'p3': return 'text-blue-400'
    default: return 'text-slate-500'
  }
}

export function priorityBg(priority: string): string {
  switch (priority) {
    case 'p1': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'p2': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'p3': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

export function blockTypeColor(type: string): string {
  switch (type) {
    case 'deep_work': return 'border-indigo-500/50 bg-indigo-500/5'
    case 'admin': return 'border-amber-500/50 bg-amber-500/5'
    case 'break': return 'border-emerald-500/50 bg-emerald-500/5'
    case 'meeting': return 'border-purple-500/50 bg-purple-500/5'
    default: return 'border-slate-600/50 bg-slate-500/5'
  }
}

export function blockTypeLabel(type: string): string {
  switch (type) {
    case 'deep_work': return 'Deep Work'
    case 'admin': return 'Admin'
    case 'break': return 'Break'
    case 'meeting': return 'Meeting'
    default: return type
  }
}
