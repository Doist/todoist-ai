'use client'

import { useState } from 'react'
import {
  CalendarDays, Clock, Zap, AlertCircle, RefreshCw,
  Flame, CheckCheck, Scissors, X, Loader2, Check,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, blockTypeColor, blockTypeLabel, priorityBg } from '@/lib/utils'
import type { DayPlan, TimeBlock } from '../api/daily-plan/route'
import type { BreakdownResponse } from '../api/breakdown/route'
import { format } from 'date-fns'

// ─── Breakdown modal ───────────────────────────────────────────────────────────

interface BreakdownModalProps {
  taskId: string
  taskContent: string
  projectId: string
  onClose: () => void
}

function BreakdownModal({ taskId, taskContent, projectId, onClose }: BreakdownModalProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'preview' | 'saving' | 'done' | 'error'>('loading')
  const [breakdown, setBreakdown] = useState<BreakdownResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch breakdown on mount
  useState(() => {
    fetch('/api/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, content: taskContent, projectId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setBreakdown(data)
        setState('preview')
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed')
        setState('error')
      })
  })

  async function confirmCreate() {
    if (!breakdown) return
    setState('saving')
    try {
      const res = await fetch('/api/breakdown', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, projectId, subtasks: breakdown.subtasks }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setState('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create subtasks')
      setState('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
          <div>
            <div className="flex items-center gap-2">
              <Scissors className="size-4 text-indigo-400" />
              <h2 className="font-semibold text-slate-100">Break Down Task</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500 line-clamp-2">{taskContent}</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-slate-500 hover:text-slate-300">
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {(state === 'loading' || state === 'idle') && (
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">AI is breaking this down…</span>
            </div>
          )}

          {state === 'preview' && breakdown && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 italic">{breakdown.reasoning}</p>
              <ul className="space-y-2">
                {breakdown.subtasks.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-lg bg-slate-800/50 px-3 py-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
                      {s.order}
                    </span>
                    <span className="text-sm text-slate-300">{s.content}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-600">
                These will be added as subtasks under the original task in Todoist.
              </p>
            </div>
          )}

          {state === 'saving' && (
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Creating subtasks in Todoist…</span>
            </div>
          )}

          {state === 'done' && (
            <div className="flex items-center gap-3 text-emerald-400">
              <Check className="size-5" />
              <span className="text-sm font-medium">
                {breakdown?.subtasks.length} subtasks created in Todoist.
              </span>
            </div>
          )}

          {state === 'error' && (
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="size-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-800 p-4">
          <Button variant="ghost" onClick={onClose}>
            {state === 'done' ? 'Close' : 'Cancel'}
          </Button>
          {state === 'preview' && (
            <Button onClick={confirmCreate}>
              <Check className="size-4" />
              Create {breakdown?.subtasks.length} subtasks
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

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

// ─── Block card ───────────────────────────────────────────────────────────────

function BlockCard({
  block,
  onBreakdown,
}: {
  block: TimeBlock
  onBreakdown: (taskId: string, content: string, projectId: string) => void
}) {
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
            <li key={task.id} className="flex items-start gap-2.5 group">
              <div className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-slate-600" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <span className={cn('text-sm leading-snug flex-1', task.isOverdue ? 'text-red-300' : 'text-slate-300')}>
                    {task.content}
                  </span>
                  {task.isOverdue && <AlertCircle className="size-3.5 shrink-0 text-red-400 mt-0.5" />}
                  {/* Breakdown button — shown on hover */}
                  <button
                    onClick={() => onBreakdown(task.id, task.content, '')}
                    title="Break into subtasks"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-700/60 hover:text-indigo-400"
                  >
                    <Scissors className="size-3" />
                    <span className="hidden sm:inline">Break down</span>
                  </button>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [breakdownTarget, setBreakdownTarget] = useState<{
    taskId: string
    content: string
    projectId: string
  } | null>(null)

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

  function handleBreakdown(taskId: string, content: string, projectId: string) {
    setBreakdownTarget({ taskId, content, projectId })
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
          <p className="mt-2 text-xs text-slate-600">
            Tip: hover any task in the plan to see the <Scissors className="inline size-3" /> Break down option.
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
            <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-800" />
            {plan.blocks.map((block, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[2.6rem] top-4 flex size-5 items-center justify-center rounded-full bg-slate-900 border border-slate-700">
                  <div className={cn(
                    'size-2 rounded-full',
                    block.type === 'deep_work' ? 'bg-indigo-400'
                      : block.type === 'break' ? 'bg-emerald-400'
                      : block.type === 'meeting' ? 'bg-purple-400'
                      : 'bg-amber-400',
                  )} />
                </div>
                <BlockCard block={block} onBreakdown={handleBreakdown} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown modal */}
      {breakdownTarget && (
        <BreakdownModal
          taskId={breakdownTarget.taskId}
          taskContent={breakdownTarget.content}
          projectId={breakdownTarget.projectId}
          onClose={() => setBreakdownTarget(null)}
        />
      )}
    </div>
  )
}
