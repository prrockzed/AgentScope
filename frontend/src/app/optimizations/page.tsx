'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useOptimizations } from '@/hooks/useOptimizations'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime, truncateId } from '@/lib/utils'
import type { OptimizationSuggestion } from '@/types'

type SourceTab = 'RULE' | 'AI'
type Severity = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'

const severityColors: Record<string, { bg: string; text: string }> = {
  HIGH:   { bg: '#4c0519', text: '#ef4444' },
  MEDIUM: { bg: '#431407', text: '#f97316' },
  LOW:    { bg: '#14291a', text: '#4ade80' },
}

const categoryColors: Record<string, string> = {
  LATENCY:         '#818cf8',
  RETRIES:         '#f472b6',
  TOKENS:          '#34d399',
  PROMPT:          '#fbbf24',
  FORMAT:          '#60a5fa',
  RUNTIME:         '#f87171',
  MODEL_CHOICE:    '#a78bfa',
  PROMPT_QUALITY:  '#fbbf24',
  TOOL_USAGE:      '#2dd4bf',
  AGENT_STRATEGY:  '#818cf8',
  PERFORMANCE:     '#34d399',
  RELIABILITY:     '#f472b6',
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors = severityColors[severity] ?? { bg: 'var(--bg-elevated)', text: 'var(--text-muted)' }
  return (
    <span
      className="rounded px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {severity}
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const color = categoryColors[category] ?? 'var(--text-muted)'
  return (
    <span className="text-xs font-mono font-medium" style={{ color }}>
      {category}
    </span>
  )
}

function SuggestionCard({ s }: { s: OptimizationSuggestion }) {
  const router = useRouter()
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-2 cursor-pointer hover:opacity-90 transition-opacity"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
      onClick={() => router.push(`/runs/${s.runId}`)}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={s.severity} />
          <CategoryBadge category={s.category} />
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{s.suggestion}</p>
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>Run {truncateId(s.runId)}</span>
        <span>·</span>
        <span>{formatRelativeTime(s.createdAt)}</span>
      </div>
    </div>
  )
}

function OptimizationsContent() {
  const searchParams = useSearchParams()
  const runFilter = searchParams.get('run')
  const tabParam = searchParams.get('tab')

  const { data: all, isLoading } = useOptimizations()

  const [activeTab, setActiveTab] = useState<SourceTab>(tabParam === 'ai' ? 'AI' : 'RULE')
  const [severity, setSeverity] = useState<Severity>('ALL')

  const filtered = useMemo(() => {
    if (!all) return []
    return all.filter((s) => {
      if (s.source !== activeTab) return false
      if (runFilter && s.runId !== runFilter) return false
      if (severity !== 'ALL' && s.severity !== severity) return false
      return true
    })
  }, [all, activeTab, severity, runFilter])

  const severities: Severity[] = ['ALL', 'HIGH', 'MEDIUM', 'LOW']

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Source tabs */}
      <div className="flex gap-2">
        {(['RULE', 'AI'] as SourceTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={
              activeTab === tab
                ? { backgroundColor: 'var(--purple-600)', color: 'white' }
                : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }
            }
          >
            {tab === 'RULE' ? 'Rule-Based' : 'AI Analysis'}
          </button>
        ))}
      </div>

      {/* Severity filter chips */}
      <div className="flex gap-2 flex-wrap">
        {severities.map((s) => (
          <button
            key={s}
            onClick={() => setSeverity(s)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={
              severity === s
                ? { backgroundColor: 'var(--purple-600)', color: 'white' }
                : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }
            }
          >
            {s}
          </button>
        ))}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center text-sm"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)', color: 'var(--text-muted)' }}
        >
          {activeTab === 'AI'
            ? "No AI analysis yet. Open a run's trace viewer and click 'Analyse with AI'."
            : 'No rule-based suggestions found for the current filter.'}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((s) => (
            <SuggestionCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function OptimizationsPage() {
  return (
    <Suspense fallback={<div className="flex flex-col gap-3">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      ))}
    </div>}>
      <OptimizationsContent />
    </Suspense>
  )
}
