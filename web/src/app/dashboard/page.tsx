'use client'

import { useState } from 'react'
import { CalendarDays, Clock, Zap, AlertCircle, RefreshCw, Flame, CheckCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, blockTypeColor, blockTypeLabel, priorityBg, formatDate } from '@/lib/utils'
import type { DayPlan, TimeBlock } from '../api/daily-plan/route'
import { format } from 'date-fns'

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
}) {
  return (
    <Card className="flex items-center gap-4">
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', color)}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-100">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </Card>
  )
}

function BlockCard({ block }: { block: TimeBlock }) {
  return (
    <div className={cn('rounded-xl border p-4 transition-all', blockTypeColor(block.type))}>
      {/* Block header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {block.startTime} – {block.endTime}
            </span>
            <Badge
              variant={
                block.type === 'deep_work' ? 'default'
                  : block.type === 'break' ? 'success'
                  : block.type === 'meeting' ? 'warning'
                  : 'muted'
              }
            >
              {blockTypeLabel(block.type)}
            </Badge>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-slate-200">{block.title}</h3>
        </div>
        {block.type === 'deep_work' && <Zap className="size-4 shrink-0 text-indigo-400" />}
        {block.type === 'break' && <span className="text-sm">☕</span>}
      </div>

      {/* Tasks */}
      {block.tasks.length > 0 && (
        <ul className="space-y-2">
          {block.tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-2.5">
              <div className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-slate-600" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <span className={cn('text-sm leading-snug', task.isOverdue ? 'text-red-300' : 'text-slate-300')}>
                    {task.content}
                  </span>
                  {task.isOverdue && <AlertCircle className="size-3.5 shrink-0 text-red-400 mt-0.5" />}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs', priorityBg(task.priority))}>
                    {task.priority}
                  </span>
                  {task.projectName && (
                    <span className="text-xs text-slate-500">{task.projectName}</span>
                  )}
                  {task.durationMinutes && (
                    <span className="flex items-center gap-0.5 text-xs text-slate-500">
                      <Clock className="size-3" />
                      {task.durationMinutes}m
                    </span>
                  )}
                  {task.labels.map((label) => (
                    <span key={label} className="text-xs text-slate-500">#{label}</span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = format(new Date(), 'EEEE, MMMM d')

  async function generatePlan() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/daily-plan')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Unknown error')
      }
      setPlan(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <CalendarDays className="size-6 text-indigo-400" />
            <h1 className="text-2xl font-bold text-slate-100">AI Daily Planner</h1>
          </div>
          <p className="mt-1 text-slate-500">{today}</p>
        </div>
        <Button onClick={generatePlan} loading={loading} size="lg">
          {plan ? <RefreshCw className="size-4" /> : <Zap className="size-4" />}
          {plan ? 'Regenerate' : 'Build My Day'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!plan && !loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 py-24 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-indigo-600/10">
            <CalendarDays className="size-8 text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-200">Your day is a blank canvas</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Click <strong className="text-slate-300">Build My Day</strong> and AI will pull your Todoist tasks and
            build an optimized, time-blocked schedule.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-800/50" />
          ))}
        </div>
      )}

      {/* Plan content */}
      {plan && !loading && (
        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard icon={CheckCheck} label="Tasks Today" value={plan.stats.totalTasks} color="bg-indigo-500/10 text-indigo-400" />
            <StatCard icon={Zap} label="Deep Work" value={`${plan.stats.deepWorkHours}h`} color="bg-purple-500/10 text-purple-400" />
            <StatCard icon={Clock} label="Admin" value={`${plan.stats.adminHours}h`} color="bg-amber-500/10 text-amber-400" />
            <StatCard icon={AlertCircle} label="Overdue" value={plan.stats.overdueCount} color="bg-red-500/10 text-red-400" />
            <StatCard icon={Flame} label="High Priority" value={plan.stats.highPriorityCount} color="bg-orange-500/10 text-orange-400" />
          </div>

          {/* Summary */}
          <Card>
            <p className="text-sm leading-relaxed text-slate-400">{plan.summary}</p>
            <p className="mt-3 text-sm font-medium text-indigo-400 italic">✦ {plan.motivationalNote}</p>
          </Card>

          {/* Timeline */}
          <div className="relative space-y-3 pl-16">
            {/* Vertical timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-800" />

            {plan.blocks.map((block, idx) => (
              <div key={idx} className="relative">
                {/* Time dot */}
                <div className="absolute -left-[2.6rem] top-4 flex size-5 items-center justify-center rounded-full bg-slate-900 border border-slate-700">
                  <div className={cn(
                    'size-2 rounded-full',
                    block.type === 'deep_work' ? 'bg-indigo-400'
                      : block.type === 'break' ? 'bg-emerald-400'
                      : block.type === 'meeting' ? 'bg-purple-400'
                      : 'bg-amber-400',
                  )} />
                </div>
                <BlockCard block={block} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
