import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean
}

export function Card({ className, glass, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-800 bg-slate-900/60 p-5',
        glass && 'backdrop-blur-sm',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-center justify-between', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold text-slate-200 uppercase tracking-wider', className)} {...props} />
}
