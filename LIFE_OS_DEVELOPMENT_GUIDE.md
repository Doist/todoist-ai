# Life OS — Master Development Guide

> A comprehensive reference for building and extending the AI-powered productivity dashboard on top of Todoist. This document covers everything already built, every remaining feature, and exact implementation steps so development can continue independently.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Environment Setup](#4-environment-setup)
5. [Architecture — How Everything Connects](#5-architecture--how-everything-connects)
6. [What Is Already Built (Phase 0 + Phase 1)](#6-what-is-already-built-phase-0--phase-1)
7. [Core Patterns — How to Add Any New Feature](#7-core-patterns--how-to-add-any-new-feature)
8. [Phase 2 — Smart Task Breakdown + Entropy Cleaner](#8-phase-2--smart-task-breakdown--entropy-cleaner)
9. [Phase 3 — Life Analytics Dashboard (Deep)](#9-phase-3--life-analytics-dashboard-deep)
10. [Phase 4 — Chief of Staff Enhancements](#10-phase-4--chief-of-staff-enhancements)
11. [Phase 5 — Life OS (Cross-Service Intelligence)](#11-phase-5--life-os-cross-service-intelligence)
12. [Todoist API Reference](#12-todoist-api-reference)
13. [Gemini AI Integration Patterns](#13-gemini-ai-integration-patterns)
14. [Deployment Guide (Vercel)](#14-deployment-guide-vercel)
15. [Known Gotchas and Lessons Learned](#15-known-gotchas-and-lessons-learned)

---

## 1. Project Overview

Life OS is a personal productivity web application that sits on top of your Todoist account and adds an AI layer. Rather than replacing Todoist, it reads your tasks and uses Google Gemini to:

- **Understand patterns** across your tasks and projects
- **Build structured output** (daily schedules, weekly reports, triage suggestions)
- **Take lightweight actions** on your behalf after you approve them

The five core features (in order of complexity):

| Feature | What it does | Status |
|---|---|---|
| AI Daily Planner | Builds a time-blocked schedule from today's tasks | ✅ Built |
| GTD Weekly Review | Generates a David Allen-style weekly review report | ✅ Built |
| Chief of Staff | Triages overdue/stale tasks with AI recommendations | ✅ Built |
| Life Analytics | Productivity trend charts and behavioral insights | ✅ Basic built |
| Smart Task Breakdown | Expands a vague task into actionable subtasks | 🔲 Phase 2 |
| Task Entropy Cleaner | Finds and cleans up "rotting" task lists | 🔲 Phase 2 |
| Deep Analytics | Circadian charts, overdue patterns, project volume | 🔲 Phase 3 |
| Life OS Integrations | Calendar, email, task autopilot | 🔲 Phase 5 |

---

## 2. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server components + API routes in one project; free on Vercel |
| Language | TypeScript (strict) | Full type safety across client and server |
| Styling | Tailwind CSS v4 | Utility-first, dark theme, no config file needed |
| UI Components | Custom (Card, Button, Badge) | Lightweight, no external component library needed |
| Charts | Recharts | Best React chart library; loaded client-side only to avoid SSR crashes |
| AI | Google Gemini 2.0 Flash (`@google/generative-ai`) | Most capable free-tier model — 1,500 req/day |
| Todoist | REST API v2 + API v1 (direct fetch) | No SDK dependency; easier to control |
| Hosting | Vercel (Hobby plan) | Free, auto-deploys on push to `main` |
| Future DB | Supabase (free tier) | Postgres for historical analytics snapshots |

---

## 3. Repository Structure

```
todoist-ai/                        ← Root (original MCP server — do not modify)
├── src/                           ← MCP server TypeScript source
├── package.json                   ← MCP server dependencies
└── web/                           ← Life OS web application (your work lives here)
    ├── .env.example               ← Copy to .env.local, fill in keys
    ├── next.config.ts
    ├── postcss.config.js          ← Must use module.exports = {}, not ESM export
    ├── tsconfig.json
    ├── package.json
    └── src/
        ├── app/
        │   ├── layout.tsx         ← Root layout: sidebar + main content wrapper
        │   ├── page.tsx           ← Redirects / → /dashboard
        │   ├── globals.css        ← Tailwind v4 import + CSS custom properties
        │   │
        │   ├── dashboard/         ← AI Daily Planner page
        │   │   └── page.tsx
        │   ├── weekly-review/     ← GTD Weekly Review page
        │   │   └── page.tsx
        │   ├── chief-of-staff/    ← Chief of Staff triage page
        │   │   └── page.tsx
        │   ├── analytics/         ← Life Analytics page
        │   │   └── page.tsx
        │   ├── settings/          ← Settings reference page
        │   │   └── page.tsx
        │   │
        │   └── api/               ← Next.js API Routes (server-side)
        │       ├── daily-plan/
        │       │   └── route.ts   ← GET: fetch tasks → Gemini → return DayPlan
        │       ├── weekly-review/
        │       │   └── route.ts   ← GET: fetch week data → Gemini → return WeeklyReport
        │       ├── chief-of-staff/
        │       │   ├── route.ts   ← GET: scan stale tasks → Gemini → return suggestions
        │       │   └── apply/
        │       │       └── route.ts ← POST: apply approved triage actions to Todoist
        │       └── analytics/
        │           └── route.ts   ← GET: productivity stats → return chart data
        │
        ├── components/
        │   ├── layout/
        │   │   └── sidebar.tsx    ← Fixed left sidebar with nav links
        │   └── ui/
        │       ├── button.tsx     ← Button component (primary/secondary/ghost/danger)
        │       ├── card.tsx       ← Card, CardHeader, CardTitle components
        │       ├── badge.tsx      ← Badge component (default/success/warning/danger/muted)
        │       └── completion-chart.tsx ← Recharts bar chart (client-only)
        │
        └── lib/
            ├── todoist.ts         ← All Todoist API calls (REST v2 + API v1)
            ├── ai.ts              ← Gemini client (generateJSON + generateText)
            └── utils.ts           ← cn(), formatDate(), priorityColor(), etc.
```

---

## 4. Environment Setup

### Local development

```bash
cd web
cp .env.example .env.local    # create the env file
npm install
npm run dev                   # starts at http://localhost:3000
```

### Required environment variables

Create `web/.env.local` with these values:

```bash
# Todoist API Key
# Get from: todoist.com → Settings → Integrations → Developer → API token
TODOIST_API_KEY=your_key_here

# Google Gemini API Key (free)
# Get from: aistudio.google.com/apikey
GOOGLE_AI_API_KEY=your_key_here

# Your work hours (24h format) — used by the Daily Planner
WORK_START_HOUR=7
WORK_END_HOUR=19

# Your timezone
TIMEZONE=Asia/Qatar
```

### Vercel environment variables

In your Vercel project dashboard → Settings → Environment Variables, add the same five variables. Vercel injects them at build and runtime — no `.env` file needed on the server.

---

## 5. Architecture — How Everything Connects

```
Browser (React)
    │
    │  fetch('/api/daily-plan')
    ▼
Next.js API Route (runs on Vercel serverless function)
    │
    ├── 1. Calls Todoist API  ←─── lib/todoist.ts
    │       REST v2: /api/v2/tasks, /api/v2/projects
    │       API v1:  /api/v1/items/completed/get_all
    │                /api/v1/user/productivity_stats
    │
    ├── 2. Calls Gemini AI  ←─────  lib/ai.ts
    │       Model: gemini-2.0-flash
    │       Returns: JSON matching a TypeScript interface
    │
    └── 3. Returns JSON to browser
            Browser renders the result as a React UI
```

**Key design principle:** All API calls to Todoist and Gemini happen in **server-side API routes**, never in the browser. This keeps your API keys secret and avoids CORS issues.

---

## 6. What Is Already Built (Phase 0 + Phase 1)

### 6.1 Todoist Client (`web/src/lib/todoist.ts`)

The single file that handles all communication with Todoist. Key points:

- Uses **REST API v2** (`https://api.todoist.com/api/v2`) for tasks and projects
- Uses **API v1** (`https://api.todoist.com/api/v1`) for completed tasks, stats, and user info — these were previously on `sync/v9` which Todoist deprecated in 2025
- The `/tasks` endpoint with a `filter` query returns a **paginated object** `{ results: [], next_cursor: "..." }` instead of a plain array — the `unwrapArray()` helper handles both shapes transparently

**Functions available:**

| Function | Endpoint | Returns |
|---|---|---|
| `getActiveTasks(filter?)` | `GET /api/v2/tasks` | All active tasks, optionally filtered |
| `getTodayTasks()` | `GET /api/v2/tasks?filter=today\|overdue` | Today's + overdue tasks |
| `getOverdueTasks()` | `GET /api/v2/tasks?filter=overdue` | Overdue tasks only |
| `getProjects()` | `GET /api/v2/projects` | All projects |
| `getCompletedTasks(since)` | `GET /api/v1/items/completed/get_all` | Completed tasks since a date |
| `getProductivityStats()` | `GET /api/v1/user/productivity_stats` | Karma, goals, daily/weekly counts |
| `getUserInfo()` | `POST /api/v1/sync` | Name, email, timezone, karma |
| `updateTask(id, updates)` | `POST /api/v2/tasks/:id` | Partial task update |

### 6.2 AI Client (`web/src/lib/ai.ts`)

Two functions wrapping Google Gemini:

```typescript
generateJSON<T>(prompt: string): Promise<T>
// Forces JSON output via responseMimeType: 'application/json'
// Strips markdown fences if model ignores the mime type
// Use this for all structured AI responses

generateText(prompt: string): Promise<string>
// Plain text output, higher temperature (0.6)
// Use for narrative content where JSON isn't needed
```

The model is hardcoded to `gemini-2.0-flash`. This is the right choice — it is fast, free-tier generous, and handles JSON output reliably.

### 6.3 AI Daily Planner (`/dashboard`)

**API route:** `web/src/app/api/daily-plan/route.ts`

Flow:
1. `getTodayTasks()` — fetches today's + overdue tasks
2. `getProjects()` — to map project IDs to names
3. Enriches each task with: priority string (p1–p4), overdue flag, duration in minutes, project name
4. Sends to Gemini with a prompt asking for a time-blocked JSON schedule
5. Returns `DayPlan` interface to the browser

**Gemini output structure (`DayPlan`):**
```typescript
interface DayPlan {
  date: string
  summary: string
  blocks: TimeBlock[]       // ordered list of time blocks
  stats: {
    totalTasks: number
    deepWorkHours: number
    adminHours: number
    overdueCount: number
    highPriorityCount: number
  }
  motivationalNote: string
}

interface TimeBlock {
  startTime: string           // "09:00"
  endTime: string             // "10:30"
  type: 'deep_work' | 'admin' | 'break' | 'meeting'
  title: string
  tasks: Array<{
    id: string
    content: string
    priority: 'p1' | 'p2' | 'p3' | 'p4'
    dueDate: string | null
    isOverdue: boolean
    durationMinutes: number | null
    labels: string[]
    projectName?: string
  }>
}
```

**Page (`/dashboard/page.tsx`):** Client component. User clicks "Build My Day" → fetches `/api/daily-plan` → renders a vertical timeline with a dot-and-line track on the left, color-coded blocks (indigo = deep work, amber = admin, green = break), task rows inside each block with priority badges and overdue flags.

### 6.4 GTD Weekly Review (`/weekly-review`)

**API route:** `web/src/app/api/weekly-review/route.ts`

Flow:
1. `getCompletedTasks(sinceDate)` — all completions in the past 7 days
2. `getOverdueTasks()` — current overdue backlog
3. `getProjects()` — project name lookup
4. `getProductivityStats()` — karma, goals, daily completion counts
5. Aggregates completions and overdue counts per project
6. Sends enriched data to Gemini for GTD-style analysis
7. Returns `WeeklyReport` interface

**Gemini output structure (`WeeklyReport`):**
```typescript
interface WeeklyReport {
  weekStart: string
  weekEnd: string
  summary: string
  stats: {
    completed: number
    overdue: number
    completionRate: string
    mostActiveProject: string
    karmaScore: number
    dailyGoal: number
    weeklyGoal: number
  }
  wins: string[]             // top 3 specific achievements
  overdueAnalysis: string    // honest pattern analysis
  projectHighlights: Array<{
    name: string
    completed: number
    overdue: number
    status: 'on_track' | 'needs_attention' | 'blocked'
  }>
  focusAreas: Array<{
    title: string
    reason: string
    suggestedTasks?: string[]
  }>
  insights: string[]         // behavioral patterns
  motivationalNote: string
}
```

**Page (`/weekly-review/page.tsx`):** Client component. "Generate Review" button → fetches → renders sections: summary card, 6-stat grid, wins list, project highlights table, overdue analysis, focus areas with suggested tasks, behavioral insights.

### 6.5 Chief of Staff (`/chief-of-staff`)

**API route:** `web/src/app/api/chief-of-staff/route.ts`

Flow:
1. `getActiveTasks()` — ALL active tasks (no filter)
2. `getProjects()` — project name lookup
3. Calculates `daysSinceDue` for each task using `date-fns`
4. Filters to tasks that are overdue or untouched for 7+ days
5. Sends up to 60 of these to Gemini for triage
6. Returns `ChiefOfStaffReport` with per-task action recommendations

**Triage actions Gemini can recommend:**

| Action | Meaning |
|---|---|
| `delete` | Task is obsolete — remove it |
| `archive` | Close/complete it to move out of active list |
| `reschedule_next_week` | Still relevant, move to next week |
| `reschedule_someday` | Good idea, no urgency — put in Someday/Maybe |
| `break_into_subtasks` | Too vague, needs breakdown |
| `keep` | Fine as-is |

**Apply route:** `web/src/app/api/chief-of-staff/apply/route.ts`

Receives the list of approved suggestions from the browser, then:
- `delete` → `DELETE /api/v2/tasks/:id`
- `archive` → `POST /api/v2/tasks/:id/close`
- `reschedule_*` → `POST /api/v2/tasks/:id` with `{ due_date: newDate }`
- `keep` / `break_into_subtasks` → no-op (user handles manually)

**Page (`/chief-of-staff/page.tsx`):** Shows summary, quick wins, duplicate detection, overdue pattern insight, then a list of triage cards. Each card has a thumbs-up / thumbs-down to approve or dismiss. User must click "Apply N Actions" to actually write to Todoist.

### 6.6 Life Analytics (`/analytics`)

**API route:** `web/src/app/api/analytics/route.ts`

Fetches `getProductivityStats()` and reshapes the `days_items` array into a 7-day completion series for the chart.

**Page:** Uses `CompletionChart` loaded via `next/dynamic` with `ssr: false` (Recharts must be client-only). Shows 4 KPI cards + the bar chart. Four "Coming in Phase 3" placeholder panels show what's next.

---

## 7. Core Patterns — How to Add Any New Feature

Every new feature follows the same three-file pattern:

### Step 1 — Add an API route

Create `web/src/app/api/<feature-name>/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getTodayTasks, getProjects } from '@/lib/todoist'
import { generateJSON } from '@/lib/ai'

// Define the output shape
export interface MyFeatureResult {
  summary: string
  items: Array<{ id: string; content: string }>
}

export async function GET() {
  try {
    // 1. Fetch data from Todoist
    const [tasks, projects] = await Promise.all([
      getTodayTasks(),
      getProjects(),
    ])

    // 2. Build prompt
    const prompt = `You are a productivity assistant.
    
Given these tasks: ${JSON.stringify(tasks)}

Return JSON matching this shape:
{
  "summary": "...",
  "items": [{ "id": "...", "content": "..." }]
}`

    // 3. Call Gemini
    const result = await generateJSON<MyFeatureResult>(prompt)

    // 4. Return to browser
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    )
  }
}
```

### Step 2 — Add a page

Create `web/src/app/<feature-name>/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { MyFeatureResult } from '../api/<feature-name>/route'

export default function MyFeaturePage() {
  const [data, setData] = useState<MyFeatureResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/<feature-name>')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Unknown error')
      }
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <Button onClick={run} loading={loading}>Run</Button>
      {error && <p className="text-red-400">{error}</p>}
      {data && <Card>{data.summary}</Card>}
    </div>
  )
}
```

### Step 3 — Add to the sidebar

Edit `web/src/components/layout/sidebar.tsx` and add your route to the `NAV_ITEMS` array:

```typescript
{
  label: 'My Feature',
  href: '/my-feature',
  icon: SomeIcon,          // import from lucide-react
  description: 'What it does',
},
```

---

## 8. Phase 2 — Smart Task Breakdown + Entropy Cleaner

### 8.1 Smart Task Breakdown

**Purpose:** When a task is too vague to act on (e.g., "Prepare performance review"), the AI expands it into 3–7 concrete subtasks and adds them to Todoist as child tasks.

**Where to add it:** This fits best as a button on each task row inside the Daily Planner (`/dashboard`), or as a standalone page at `/breakdown`.

#### Implementation steps

**1. Create the API route** at `web/src/app/api/breakdown/route.ts`:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { generateJSON } from '@/lib/ai'

interface BreakdownRequest {
  taskId: string
  content: string
  description?: string
  projectId: string
}

interface BreakdownResult {
  subtasks: Array<{
    content: string
    order: number
  }>
  reasoning: string
}

export async function POST(req: NextRequest) {
  const { taskId, content, description, projectId }: BreakdownRequest = await req.json()

  const prompt = `You are a GTD productivity coach. Break this vague task into 3–7 concrete, 
actionable subtasks. Each subtask should be completable in one sitting.

Task: "${content}"
${description ? `Context: "${description}"` : ''}

Rules:
- Start each subtask with an action verb (Write, Research, Schedule, Review, Send, etc.)
- Be specific — avoid vague words like "finalize" or "handle"
- Order logically (prerequisite steps first)
- Max 7 subtasks; prefer 4–5 for most tasks

Return JSON:
{
  "subtasks": [
    { "content": "...", "order": 1 },
    { "content": "...", "order": 2 }
  ],
  "reasoning": "One sentence explaining the breakdown approach"
}`

  const result = await generateJSON<BreakdownResult>(prompt)

  // Create subtasks via Todoist REST API
  const API_KEY = process.env.TODOIST_API_KEY!
  const created = []

  for (const subtask of result.subtasks) {
    const res = await fetch('https://api.todoist.com/api/v2/tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: subtask.content,
        parent_id: taskId,
        project_id: projectId,
        order: subtask.order,
      }),
    })
    if (res.ok) created.push(await res.json())
  }

  return NextResponse.json({ created: created.length, subtasks: result.subtasks, reasoning: result.reasoning })
}
```

**2. Add a breakdown button** inside the `BlockCard` component in `web/src/app/dashboard/page.tsx`:

Add a small button next to each task:

```tsx
<button
  onClick={() => handleBreakdown(task.id, task.content)}
  className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-400"
>
  <Scissors className="size-3" />
  Break down
</button>
```

**3. Add state and handler** in the dashboard page:

```typescript
const [breakingDown, setBreakingDown] = useState<string | null>(null)
const [breakdown, setBreakdown] = useState<Record<string, string[]>>({})

async function handleBreakdown(taskId: string, content: string) {
  setBreakingDown(taskId)
  const res = await fetch('/api/breakdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, content, projectId: '...' }),
  })
  const data = await res.json()
  setBreakdown((prev) => ({ ...prev, [taskId]: data.subtasks.map((s: { content: string }) => s.content) }))
  setBreakingDown(null)
}
```

**4. Show preview before creating** (recommended):
Instead of creating directly, show a modal/popover with the proposed subtasks and a "Create subtasks" confirm button. This matches the "preview before acting" principle used in Chief of Staff.

---

### 8.2 Task Entropy Cleaner

**Purpose:** Todoist lists "rot" over time — tasks get added and forgotten. This feature scans the entire task list for signs of entropy (vague content, no due date, stale projects, orphaned tasks) and suggests cleanup actions.

**Difference from Chief of Staff:** Chief of Staff focuses on *overdue* tasks. Entropy Cleaner targets tasks that are technically not overdue but are still problematic — too vague, in dead projects, or have been sitting untouched for months.

#### Entropy signals to detect (send these to Gemini)

```typescript
interface EntropySignals {
  id: string
  content: string
  createdAt: string          // how long it's been in the list
  daysOld: number
  hasNoDueDate: boolean
  hasSingleWordContent: boolean     // e.g., "Report" — too vague
  projectName: string
  hasNoDescription: boolean
  labels: string[]
  priority: string
}
```

#### Implementation steps

**1. Create the API route** at `web/src/app/api/entropy/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getActiveTasks, getProjects, normalizePriority } from '@/lib/todoist'
import { generateJSON } from '@/lib/ai'
import { differenceInDays, parseISO } from 'date-fns'

export interface EntropyResult {
  summary: string
  totalScanned: number
  highEntropyTasks: Array<{
    taskId: string
    content: string
    projectName: string
    entropyScore: number      // 1–10, 10 = most entropic
    signals: string[]         // reasons for high entropy
    suggestedAction: 'delete' | 'rewrite' | 'add_due_date' | 'break_into_subtasks' | 'move_to_someday'
    rewriteSuggestion?: string  // if suggestedAction === 'rewrite'
  }>
  cleanTasks: number
  insights: string[]
}

export async function GET() {
  try {
    const [tasks, projects] = await Promise.all([getActiveTasks(), getProjects()])
    const projectMap = new Map(projects.map((p) => [p.id, p.name]))
    const today = new Date()

    const enriched = tasks.map((t) => ({
      id: t.id,
      content: t.content,
      daysOld: differenceInDays(today, parseISO(t.created_at)),
      hasNoDueDate: !t.due,
      hasShortContent: t.content.split(' ').length <= 2,
      hasNoDescription: !t.description,
      priority: normalizePriority(t.priority),
      projectName: projectMap.get(t.project_id) ?? 'Inbox',
      labels: t.labels,
    }))

    // Only send tasks with at least one entropy signal to save tokens
    const candidates = enriched.filter((t) =>
      t.daysOld > 30 || t.hasNoDueDate || t.hasShortContent
    ).slice(0, 80)

    const prompt = `You are a personal productivity coach performing a "task entropy audit."
    
Entropy = tasks that exist in the system but are not actually being worked on and are making the system harder to navigate.

Today: ${today.toISOString().split('T')[0]}
Total active tasks: ${tasks.length}
Candidate tasks with entropy signals (${candidates.length}):
${JSON.stringify(candidates, null, 2)}

For each task, assess:
- Entropy score (1–10): how problematic is this task's presence in the list?
- Signals: what specific entropy indicators does it have?
- Suggested action: what should be done?
  - "delete": clearly obsolete
  - "rewrite": content is too vague — provide a rewriteSuggestion
  - "add_due_date": good task but drifting with no deadline
  - "break_into_subtasks": too complex for a single task
  - "move_to_someday": valid idea but not actionable now
- Only flag tasks with entropy score >= 6

Return JSON:
{
  "summary": "2-sentence overall assessment",
  "totalScanned": ${candidates.length},
  "highEntropyTasks": [
    {
      "taskId": "...",
      "content": "...",
      "projectName": "...",
      "entropyScore": 8,
      "signals": ["30+ days old", "no due date", "single word"],
      "suggestedAction": "rewrite",
      "rewriteSuggestion": "Research Q3 ETF rebalancing options by end of month"
    }
  ],
  "cleanTasks": ${tasks.length - candidates.length},
  "insights": ["pattern insight 1", "insight 2"]
}`

    const result = await generateJSON<EntropyResult>(prompt)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    )
  }
}
```

**2. Create the page** at `web/src/app/entropy/page.tsx`:

The UI should:
- Show a scan button
- Render entropy tasks sorted by score (highest first)
- Show entropy signals as badges (e.g., "34 days old", "no due date")
- For "rewrite" suggestions, show the rewrite suggestion with a copy button
- Have approve/dismiss per task
- Have a bulk apply button (same pattern as Chief of Staff)

**3. Add to sidebar** (`web/src/components/layout/sidebar.tsx`):

```typescript
{
  label: 'Entropy Cleaner',
  href: '/entropy',
  icon: Recycle,           // import from lucide-react
  description: 'Clean up stale task lists',
},
```

---

## 9. Phase 3 — Life Analytics Dashboard (Deep)

**Purpose:** Move beyond the basic 7-day chart to reveal genuine behavioral patterns. This phase requires storing daily snapshots in a database because Todoist only gives you real-time data — it doesn't let you query "how many tasks did I have on March 15th?"

### 9.1 Database Setup (Supabase)

**1. Create a Supabase project** at supabase.com (free tier — 500MB, plenty for personal use).

**2. Create these tables** in the Supabase SQL editor:

```sql
-- Daily snapshot of task counts per project
CREATE TABLE task_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  active_count INTEGER NOT NULL DEFAULT 0,
  overdue_count INTEGER NOT NULL DEFAULT 0,
  completed_today INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON task_snapshots (snapshot_date);
CREATE UNIQUE INDEX ON task_snapshots (snapshot_date, project_id);

-- Completed task log with hour of day (for circadian analysis)
CREATE TABLE completion_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL,
  content TEXT NOT NULL,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  hour_of_day INTEGER NOT NULL,  -- 0–23
  priority TEXT NOT NULL,        -- p1, p2, p3, p4
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON completion_log (completed_at);
CREATE INDEX ON completion_log (hour_of_day);
CREATE UNIQUE INDEX ON completion_log (task_id);  -- prevent duplicates

-- Weekly review history
CREATE TABLE weekly_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL UNIQUE,
  report JSONB NOT NULL,         -- stores the full WeeklyReport object
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**3. Add Supabase to the project:**

```bash
cd web
npm install @supabase/supabase-js
```

Add to `web/.env.local`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**4. Create the Supabase client** at `web/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)
```

### 9.2 Daily Snapshot Cron Job

This is the engine that makes historical analytics possible. It runs once per day and records the state of your Todoist.

**1. Create the snapshot API route** at `web/src/app/api/cron/snapshot/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getActiveTasks, getOverdueTasks, getCompletedTasks, getProjects } from '@/lib/todoist'
import { supabase } from '@/lib/supabase'
import { format, subDays, parseISO } from 'date-fns'

export async function GET(req: Request) {
  // Protect the cron endpoint
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd'T'00:00:00")

  const [tasks, overdueTasks, completedToday, projects] = await Promise.all([
    getActiveTasks(),
    getOverdueTasks(),
    getCompletedTasks(yesterday),
    getProjects(),
  ])

  const projectMap = new Map(projects.map((p) => [p.id, p.name]))

  // Count per project
  const activeByProject = new Map<string, number>()
  const overdueByProject = new Map<string, number>()
  const completedByProject = new Map<string, number>()

  for (const t of tasks) {
    const name = projectMap.get(t.project_id) ?? 'Inbox'
    activeByProject.set(name, (activeByProject.get(name) ?? 0) + 1)
  }
  for (const t of overdueTasks) {
    const name = projectMap.get(t.project_id) ?? 'Inbox'
    overdueByProject.set(name, (overdueByProject.get(name) ?? 0) + 1)
  }
  for (const t of completedToday) {
    const name = projectMap.get(t.project_id) ?? 'Inbox'
    completedByProject.set(name, (completedByProject.get(name) ?? 0) + 1)
  }

  // Upsert snapshots
  const rows = projects.map((p) => ({
    snapshot_date: today,
    project_id: p.id,
    project_name: p.name,
    active_count: activeByProject.get(p.name) ?? 0,
    overdue_count: overdueByProject.get(p.name) ?? 0,
    completed_today: completedByProject.get(p.name) ?? 0,
  }))

  await supabase.from('task_snapshots').upsert(rows, { onConflict: 'snapshot_date,project_id' })

  // Log individual completions for circadian analysis
  const completionRows = completedToday.map((t) => ({
    task_id: t.task_id,
    content: t.content,
    project_id: t.project_id,
    project_name: projectMap.get(t.project_id) ?? 'Inbox',
    completed_at: t.completed_at,
    hour_of_day: new Date(t.completed_at).getHours(),
    priority: 'p4',   // enrich this later
    labels: [],
  }))

  if (completionRows.length > 0) {
    await supabase.from('completion_log').upsert(completionRows, { onConflict: 'task_id' })
  }

  return NextResponse.json({ snapshotDate: today, projects: rows.length, completions: completionRows.length })
}
```

**2. Configure Vercel Cron** — add to `web/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/snapshot",
      "schedule": "0 23 * * *"
    }
  ]
}
```

This runs at 23:00 UTC (midnight Qatar time) every day. Add `CRON_SECRET=any-random-string` to your Vercel env vars and to your local `.env.local`.

### 9.3 Circadian Productivity Chart

**Purpose:** Shows what hour of the day you complete the most tasks. Answers: "Am I actually a morning person?"

**API route** at `web/src/app/api/analytics/circadian/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { subDays } from 'date-fns'

export async function GET() {
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

  const { data } = await supabase
    .from('completion_log')
    .select('hour_of_day')
    .gte('completed_at', thirtyDaysAgo)

  // Count completions per hour
  const hourCounts = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: `${i.toString().padStart(2, '0')}:00`,
    completed: 0,
  }))

  for (const row of data ?? []) {
    hourCounts[row.hour_of_day].completed++
  }

  return NextResponse.json({ hours: hourCounts })
}
```

**Chart component** — add to `web/src/components/ui/circadian-chart.tsx` (same pattern as `completion-chart.tsx`, loaded with `ssr: false`). Use a `BarChart` from Recharts showing hours 0–23 on X-axis.

### 9.4 Project Volume Chart

**Purpose:** Shows where your time/attention is actually going across projects over the past 30 days.

```typescript
// API route: /api/analytics/projects
const { data } = await supabase
  .from('task_snapshots')
  .select('project_name, completed_today')
  .gte('snapshot_date', thirtyDaysAgo)

// Aggregate: sum completed_today per project
```

Use a `PieChart` or horizontal `BarChart` from Recharts to visualize.

### 9.5 Overdue Pattern Analysis

**Purpose:** Identifies which projects and task types are chronically delayed.

```typescript
// API route: /api/analytics/overdue-patterns
const { data } = await supabase
  .from('task_snapshots')
  .select('snapshot_date, project_name, overdue_count')
  .gte('snapshot_date', thirtyDaysAgo)
  .order('overdue_count', { ascending: false })

// Then send to Gemini:
// "Based on 30 days of overdue data, what patterns do you see?
//  Which projects are chronically behind? What might be causing this?"
```

---

## 10. Phase 4 — Chief of Staff Enhancements

### 10.1 "Future You" Reminder Agent

**Purpose:** Tracks tasks that have been postponed multiple times and surfaces them for a decision: delete, delegate, or commit.

**How to detect postponements:** Each time Chief of Staff runs and a user approves a `reschedule_*` action, log it to Supabase:

```sql
CREATE TABLE postponement_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL,
  task_content TEXT NOT NULL,
  postponed_at TIMESTAMPTZ DEFAULT NOW(),
  new_due_date DATE NOT NULL
);

CREATE INDEX ON postponement_log (task_id);
```

Then when Chief of Staff runs, join with this table to show postponement count:

```typescript
// In chief-of-staff/route.ts
const { data: postponements } = await supabase
  .from('postponement_log')
  .select('task_id, count(*)')
  .group('task_id')
  .having('count(*)', 'gte', 3)   // flagged after 3 postponements
```

Add to the Gemini prompt context and the UI: "⚠️ Postponed 4 times" badge on relevant tasks.

### 10.2 Procrastination Pattern Detector

**Purpose:** Finds categories of tasks you consistently avoid.

After building up 30+ days of completion log data in Supabase, add an API route that:

1. Pulls all tasks that have been postponed 2+ times
2. Looks at their labels, project names, and content keywords
3. Sends to Gemini: "What patterns do you see in the tasks this person avoids? What categories of work are being chronically deferred?"

Returns insights like:
- "You tend to avoid tasks involving writing (5 postponements) and phone calls (3 postponements)"
- "Finance project tasks are completed 40% less frequently than average"

---

## 11. Phase 5 — Life OS (Cross-Service Intelligence)

These features connect Todoist to other data sources. They represent the "holy grail" of the system.

### 11.1 Google Calendar Integration

**Purpose:** Block time on your calendar automatically when the Daily Planner generates a schedule.

**Setup:**
1. Enable Google Calendar API in Google Cloud Console
2. Add OAuth credentials (or use a service account for personal use)
3. Install: `npm install googleapis`

**API route** at `web/src/app/api/calendar/block-time/route.ts`:

```typescript
import { google } from 'googleapis'

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
)
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

const calendar = google.calendar({ version: 'v3', auth })

// For each block in the DayPlan, create a calendar event:
await calendar.events.insert({
  calendarId: 'primary',
  requestBody: {
    summary: block.title,
    description: block.tasks.map((t) => `• ${t.content}`).join('\n'),
    start: { dateTime: `${today}T${block.startTime}:00`, timeZone: 'Asia/Qatar' },
    end: { dateTime: `${today}T${block.endTime}:00`, timeZone: 'Asia/Qatar' },
    colorId: block.type === 'deep_work' ? '9' : '5',   // 9=blueberry, 5=banana
  },
})
```

Add a "Block on Calendar" button to the Daily Planner that sends the generated plan to this route.

### 11.2 Task Autopilot

**Purpose:** For tasks that involve fetching information (e.g., "Check ETF dividends"), AI can actually complete the task and attach the result as a comment.

**Example flow for "Check ETF dividends" task:**

1. User clicks "Autopilot" on a task
2. API route calls Gemini with the task content
3. Gemini identifies what data is needed
4. Route fetches the data (using `fetch` to public APIs)
5. Gemini formats a summary
6. Route posts the summary as a Todoist comment via `POST /api/v2/comments`
7. Route marks the task complete via `POST /api/v2/tasks/:id/close`

```typescript
// POST /api/autopilot
// Body: { taskId: string, content: string }

// Step 1: Ask Gemini what data to fetch
const plan = await generateJSON<{
  canAutoComplete: boolean
  dataNeeded: string
  fetchUrl?: string
  reasoning: string
}>(
  `Can this task be completed by fetching public data? Task: "${content}"
   If yes, provide a public URL to fetch. Return JSON.`
)

if (!plan.canAutoComplete || !plan.fetchUrl) {
  return NextResponse.json({ status: 'manual_required', reason: plan.reasoning })
}

// Step 2: Fetch the data
const dataRes = await fetch(plan.fetchUrl)
const rawData = await dataRes.text()

// Step 3: Summarize
const summary = await generateText(
  `Summarize this data in the context of the task "${content}": ${rawData.slice(0, 3000)}`
)

// Step 4: Post comment to Todoist
await fetch('https://api.todoist.com/api/v2/comments', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.TODOIST_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ task_id: taskId, content: `🤖 Autopilot result:\n\n${summary}` }),
})
```

---

## 12. Todoist API Reference

### Base URLs

```
REST API v2:  https://api.todoist.com/api/v2
API v1:       https://api.todoist.com/api/v1
```

> ⚠️ **Important:** The old `sync/v9` API is deprecated as of 2025. Use `/api/v1/` for all previously-sync-only endpoints (completed tasks, productivity stats, user info). Using `sync/v9` returns HTTP 410.

### Authentication

All requests use Bearer token authentication:

```
Authorization: Bearer YOUR_TODOIST_API_KEY
```

### Key Endpoints

#### Tasks

```
GET  /api/v2/tasks                     Get active tasks
     ?filter=today | overdue           Todoist filter query
     ?project_id=123                   Filter by project

POST /api/v2/tasks                     Create a task
     Body: { content, project_id, parent_id, due_date, priority, duration }

POST /api/v2/tasks/:id                 Update a task (partial)
     Body: { content?, due_date?, priority? }

POST /api/v2/tasks/:id/close           Complete a task
DELETE /api/v2/tasks/:id               Delete a task
```

#### Task priorities (API uses numbers, we normalize to strings)

```
API value 4 = p1 (urgent, red)
API value 3 = p2 (high, orange)
API value 2 = p3 (medium, blue)
API value 1 = p4 (normal, grey) ← default
```

#### Projects

```
GET /api/v2/projects                   List all projects
```

#### Completed tasks (API v1)

```
GET /api/v1/items/completed/get_all
    ?since=2024-01-01T00:00:00         ISO datetime, tasks completed after this
    ?limit=200                          Max items to return (default 30, max 200)
```

Response shape:
```json
{
  "items": [
    {
      "id": "...",
      "task_id": "...",
      "content": "Task name",
      "project_id": "...",
      "completed_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Productivity stats (API v1)

```
GET /api/v1/user/productivity_stats
```

Response shape:
```json
{
  "karma": 45230,
  "karma_trend": "up",
  "days_items": [
    { "date": "2024-01-15", "total_completed": 7, "items": [...] }
  ],
  "week_items": [...],
  "goals": {
    "daily_goal": 5,
    "weekly_goal": 25,
    "ignore_days": [0, 6]
  }
}
```

#### Comments

```
POST /api/v2/comments                  Add a comment to a task
     Body: { task_id, content }
```

---

## 13. Gemini AI Integration Patterns

### Getting good JSON output

Always describe the exact JSON shape you want in the prompt. The model is instructed via `responseMimeType: 'application/json'` but you should also show the structure:

```typescript
const prompt = `...your instructions...

Return exactly this JSON shape (no extra fields, no explanations):
{
  "field1": "string value",
  "field2": 42,
  "items": [{ "id": "...", "label": "..." }]
}`
```

### Prompt engineering tips

**Be specific about quantities.** Instead of "summarize", say "summarize in 2–3 sentences." Instead of "list improvements", say "list exactly 3 specific improvements."

**Give context the model wouldn't have.** Tell it the date, the user's timezone, work hours, and any personal context (e.g., "the user works in finance in Qatar").

**Tell it what NOT to do.** "Do not use generic phrases like 'great job'. Reference specific task names."

**Constrain the output format.** The model is more reliable when you list every field with its type in the prompt.

### Token efficiency

Gemini 2.0 Flash has a 1M token context window and a free tier of 1,500 requests/day. For personal use you will never hit limits, but still:

- Don't send full task descriptions unless needed — `content` is usually enough
- Slice large arrays: `.slice(0, 50)` before sending to the prompt
- For the Chief of Staff prompt, only send tasks with at least one issue — not the full list

### Handling AI failures gracefully

Always wrap `generateJSON` in try/catch and return a meaningful error to the browser:

```typescript
try {
  const result = await generateJSON<MyType>(prompt)
  return NextResponse.json(result)
} catch (error) {
  console.error('AI generation failed:', error)
  return NextResponse.json(
    { error: 'AI is temporarily unavailable. Try again in a moment.' },
    { status: 503 }
  )
}
```

---

## 14. Deployment Guide (Vercel)

### Initial setup

1. Push your branch to GitHub
2. Go to vercel.com → New Project → Import `ustunfatih/todoist-ai`
3. **Set Root Directory to `web`** — critical, otherwise Vercel looks in the wrong folder
4. Add environment variables (Settings → Environment Variables):
   - `TODOIST_API_KEY`
   - `GOOGLE_AI_API_KEY`
   - `WORK_START_HOUR` = `7`
   - `WORK_END_HOUR` = `19`
   - `TIMEZONE` = `Asia/Qatar`
5. Click Deploy

### Auto-deploy

Every push to `main` triggers an automatic Vercel deployment. Branch pushes create preview deployments at a separate URL.

### Checking logs

In the Vercel dashboard → your project → Deployments → click a deployment → Functions tab. You can see the output of each API route call, which is essential for debugging.

### Adding Supabase (Phase 3)

Add to Vercel environment variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `CRON_SECRET` (any random string — used to protect the cron endpoint)

Vercel Cron is free on the Hobby plan for up to 2 cron jobs.

---

## 15. Known Gotchas and Lessons Learned

These are real bugs encountered during development. Avoid repeating them.

### 1. Todoist sync/v9 is deprecated (HTTP 410)

**Symptom:** API calls return 410 with message about deprecated endpoints.

**Cause:** Todoist shut down `https://api.todoist.com/sync/v9/*` in 2025.

**Fix:** Use `https://api.todoist.com/api/v1/*` for:
- `/api/v1/items/completed/get_all`
- `/api/v1/user/productivity_stats`
- `/api/v1/sync`

The REST v2 endpoints (`/api/v2/tasks`, `/api/v2/projects`) are unaffected.

---

### 2. Tasks API returns paginated object, not array

**Symptom:** `t.map is not a function` error when calling `getActiveTasks()`.

**Cause:** When using the `filter` query parameter, `/api/v2/tasks` returns `{ results: [...], next_cursor: "..." }` instead of a plain array.

**Fix:** Use the `unwrapArray()` helper in `lib/todoist.ts` which handles both shapes:

```typescript
function unwrapArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && 'results' in data) {
    return (data as { results: T[] }).results
  }
  return []
}
```

---

### 3. Recharts crashes on server-side rendering

**Symptom:** Analytics page shows "Application error: a client-side exception has occurred."

**Cause:** Recharts internally accesses `window` and `document` which don't exist during Next.js server-side rendering.

**Fix:** Put all Recharts code in a separate component file and import it with `next/dynamic` and `ssr: false`:

```typescript
// In your page file:
const CompletionChart = dynamic(
  () => import('@/components/ui/completion-chart'),
  { ssr: false }
)
```

Do NOT try to `dynamic()` import individual Recharts primitives (Bar, XAxis, etc.) — the TypeScript types are incompatible with Next.js's `dynamic()` wrapper.

---

### 4. PostCSS config must use CommonJS format

**Symptom:** Build fails with "Your custom PostCSS configuration must export a `plugins` key."

**Cause:** `postcss.config.js` used ESM `export default` syntax, but Next.js's PostCSS loader expects CommonJS.

**Fix:** Always write `postcss.config.js` as:

```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

---

### 5. TypeScript target must be ES2017+ for Map/Set iteration

**Symptom:** "Type 'MapIterator' can only be iterated with --downlevelIteration flag."

**Cause:** Spreading Map/Set iterators (`[...map.keys()]`) requires ES2015+ target.

**Fix:** Use `Array.from()` instead of spread:

```typescript
// Instead of: [...map.keys()]
Array.from(map.keys())

// Instead of: [...map.entries()].sort(...)
Array.from(map.entries()).sort(...)

// Instead of: new Set([...a, ...b])
new Set(Array.from(a).concat(Array.from(b)))
```

---

### 6. Vercel deploys from `main` branch only by default

**Symptom:** Changes pushed to a feature branch don't appear on the live site.

**Cause:** Vercel's production deployment is tied to the `main` branch.

**Fix:** Merge your feature branch into `main` via a pull request on GitHub. Vercel auto-deploys on every push to `main`. Feature branches get preview URLs (not the main domain).

---

*Last updated: Phase 0 + Phase 1 complete. Phase 2 ready to implement.*
