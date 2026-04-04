'use client'

import { useState } from 'react'
import {
  Recycle, AlertCircle, RefreshCw, Zap, Lightbulb,
  Trash2, Edit3, Calendar, GitBranch, Archive, CheckCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { EntropyResult, EntropyTask, EntropyAction } from '../api/entropy/route'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function actionIcon(action: EntropyAction) {
  switch (action) {
    case 'delete': return <Trash2 className="size-4 text-red-400" />
    case 'rewrite': return <Edit3 className="size-4 text-amber-400" />
    case 'add_due_date': return <Calendar className="size-4 text-blue-400" />
    case 'break_into_subtasks': return <GitBranch className="size-4 text-purple-400" />
    case 'move_to_someday': return <Archive className="size-4 text-slate-400" />
  }
}

function actionLabel(action: EntropyAction) {
  switch (action) {
    case 'delete': return 'Delete'
    case 'rewrite': return 'Rewrite'
    case 'add_due_date': return 'Add due date'
    case 'break_into_subtasks': return 'Break down'
    case 'move_to_someday': return 'Someday'
  }
}

function actionBadgeVariant(action: EntropyAction): 'danger' | 'warning' | 'default' | 'muted' {
  switch (action) {
    case 'delete': return 'danger'
    case 'rewrite': return 'warning'
    case 'add_due_date': return 'default'
    default: return 'muted'
  }
}

function EntropyScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-slate-700 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            score >= 8 ? 'bg-red-500' : score >= 6 ? 'bg-amber-500' : 'bg-emerald-500',
          )}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
      <span className={cn(
        'text-xs font-bold tabular-nums',
        score >= 8 ? 'text-red-400' : score >= 6 ? 'text-amber-400' : 'text-slate-500',
      )}>
        {score}/10
      </span>
    </div>
  )
}

// ─── Task card ────────────────────────────────────────────────────────────────

function EntropyTaskCard({
  task,
  dismissed,
  onDismiss,
}: {
  task: EntropyTask
  dismissed: boolean
  onDismiss: (id: string) => void
}) {
  if (dismissed) return null

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 transition-all hover:border-slate-600/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Task content + project */}
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-200 leading-snug">{task.content}</span>
            <span className="text-xs text-slate-600">· {task.projectName}</span>
          </div>

          {/* Entropy score + signals */}
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <EntropyScoreBar score={task.entropyScore} />
            <div className="flex flex-wrap gap-1">
              {task.signals.map((signal) => (
                <span
                  key={signal}
                  className="inline-flex items-center rounded-full bg-slate-700/60 px-2 py-0.5 text-xs text-slate-400"
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>

          {/* Suggested action */}
          <div className="mt-3 flex items-center gap-2">
            {actionIcon(task.suggestedAction)}
            <Badge variant={actionBadgeVariant(task.suggestedAction)}>
              {actionLabel(task.suggestedAction)}
            </Badge>
          </div>

          {/* Rewrite suggestion */}
          {task.suggestedAction === 'rewrite' && task.rewriteSuggestion && (
            <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <p className="text-xs text-slate-500 mb-1">Suggested rewrite:</p>
              <p className="text-sm text-amber-200">{task.rewriteSuggestion}</p>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(task.taskId)}
          className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors text-xs"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EntropyPage() {
  const [result, setResult] = useState<EntropyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  async function runScan() {
    setLoading(true)
    setError(null)
    setDismissed(new Set())
    try {
      const res = await fetch('/api/entropy')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Unknown error')
      }
      setResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  function dismiss(taskId: string) {
    setDismissed((prev) => new Set(prev).add(taskId))
  }

  const visible = result?.highEntropyTasks.filter((t) => !dismissed.has(t.taskId)) ?? []
  const sortedTasks = [...visible].sort((a, b) => b.entropyScore - a.entropyScore)

  // Counts by action
  const actionCounts = result?.highEntropyTasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.suggestedAction] = (acc[t.suggestedAction] ?? 0) + 1
    return acc
  }, {}) ?? {}

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Recycle className="size-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-slate-100">Entropy Cleaner</h1>
          </div>
          <p className="mt-1 text-slate-500">
            Scans your task list for vague, stale, and drifting tasks that are making your system harder to navigate.
          </p>
        </div>
        <Button onClick={runScan} loading={loading} size="lg">
          {result ? <RefreshCw className="size-4" /> : <Zap className="size-4" />}
          {result ? 'Re-scan' : 'Scan for Entropy'}
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
      {!result && !loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 py-24 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-600/10">
            <Recycle className="size-8 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-200">Find the rot in your task list</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Click <strong className="text-slate-300">Scan for Entropy</strong> to find tasks that are too vague,
            too old, or no longer actionable.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="h-20 animate-pulse rounded-xl bg-slate-800/50" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-800/50" />
          ))}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Summary + stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCheck className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-100">{result.totalScanned}</div>
                <div className="text-xs text-slate-500">Tasks scanned</div>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-100">{result.highEntropyTasks.length}</div>
                <div className="text-xs text-slate-500">High entropy tasks</div>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-500/10 text-slate-400">
                <Recycle className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-100">{result.cleanTasks}</div>
                <div className="text-xs text-slate-500">Clean tasks</div>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Trash2 className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-100">{actionCounts['delete'] ?? 0}</div>
                <div className="text-xs text-slate-500">Suggested deletes</div>
              </div>
            </Card>
          </div>

          {/* Summary card */}
          <Card>
            <p className="text-sm leading-relaxed text-slate-400">{result.summary}</p>
          </Card>

          {/* Insights */}
          {result.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <Lightbulb className="size-4 text-amber-400" />
                  Behavioral Insights
                </CardTitle>
              </CardHeader>
              <ul className="mt-3 space-y-2">
                {result.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-400/60" />
                    {insight}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Action breakdown legend */}
          {Object.keys(actionCounts).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(Object.entries(actionCounts) as [EntropyAction, number][]).map(([action, count]) => (
                <div key={action} className="flex items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-1.5">
                  {actionIcon(action)}
                  <span className="text-xs text-slate-400">{count}× {actionLabel(action)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Task list */}
          {sortedTasks.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-10 text-center">
              <CheckCheck className="mx-auto mb-2 size-8 text-emerald-400" />
              <p className="text-sm text-emerald-400 font-medium">All flagged tasks dismissed</p>
              <p className="text-xs text-slate-600 mt-1">Re-scan to get fresh suggestions</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">
                  High Entropy Tasks
                  <span className="ml-2 text-slate-600">({sortedTasks.length} remaining)</span>
                </h2>
                <p className="text-xs text-slate-600">Sorted by entropy score · Dismiss to hide</p>
              </div>
              {sortedTasks.map((task) => (
                <EntropyTaskCard
                  key={task.taskId}
                  task={task}
                  dismissed={dismissed.has(task.taskId)}
                  onDismiss={dismiss}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
