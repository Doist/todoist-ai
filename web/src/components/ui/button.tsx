import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled ?? loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700',
        variant === 'secondary' && 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700',
        variant === 'ghost' && 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
        variant === 'danger' && 'bg-red-600/10 text-red-400 border border-red-500/30 hover:bg-red-600/20',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-2.5 text-base',
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
      )}
      {children}
    </button>
  )
}
