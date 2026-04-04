import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
        variant === 'success' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        variant === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-400',
        variant === 'danger' && 'border-red-500/30 bg-red-500/10 text-red-400',
        variant === 'muted' && 'border-slate-600/30 bg-slate-500/10 text-slate-400',
        className,
      )}
      {...props}
    />
  )
}
