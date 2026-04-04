'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  BarChart3,
  Brain,
  Sparkles,
  Settings,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  {
    label: 'Daily Planner',
    href: '/dashboard',
    icon: CalendarDays,
    description: 'AI-built day schedule',
  },
  {
    label: 'Weekly Review',
    href: '/weekly-review',
    icon: Sparkles,
    description: 'GTD review & insights',
  },
  {
    label: 'Chief of Staff',
    href: '/chief-of-staff',
    icon: Brain,
    description: 'Autonomous task cleanup',
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Life productivity patterns',
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-slate-800 bg-slate-950">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600">
          <Zap className="size-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-100">Life OS</div>
          <div className="text-xs text-slate-500">Powered by Todoist + AI</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon, description }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all',
                active
                  ? 'bg-indigo-600/15 text-indigo-400'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
              )}
            >
              <Icon className={cn('size-4 shrink-0', active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300')} />
              <div className="min-w-0">
                <div className="text-sm font-medium leading-none">{label}</div>
                <div className="mt-0.5 truncate text-xs text-slate-500">{description}</div>
              </div>
              {active && (
                <div className="ml-auto size-1.5 rounded-full bg-indigo-400 shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-500 transition-all hover:bg-slate-800/60 hover:text-slate-300"
        >
          <Settings className="size-4" />
          <span className="text-sm">Settings</span>
        </Link>
      </div>
    </aside>
  )
}
