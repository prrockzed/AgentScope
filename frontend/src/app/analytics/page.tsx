'use client'

import { useMemo } from 'react'
import { useRuns } from '@/hooks/useRuns'
import { formatDuration } from '@/lib/utils'
import { StatCard } from '@/components/analytics/StatCard'
import { LatencyChart } from '@/components/analytics/LatencyChart'
import { TokenUsageChart } from '@/components/analytics/TokenUsageChart'
import { StatusDonut } from '@/components/analytics/StatusDonut'
import { Skeleton } from '@/components/ui/skeleton'

export default function AnalyticsPage() {
  const { data: runs, isLoading } = useRuns()

  const stats = useMemo(() => {
    if (!runs || runs.length === 0) return null
    const completed = runs.filter((r) => r.status !== 'RUNNING' && r.totalLatency != null)
    const avgLatency =
      completed.length > 0
        ? Math.round(completed.reduce((sum, r) => sum + (r.totalLatency ?? 0), 0) / completed.length)
        : null
    const successRate =
      completed.length > 0
        ? Math.round((runs.filter((r) => r.status === 'SUCCESS').length / runs.length) * 100)
        : null
    const totalTokens = runs.reduce((sum, r) => sum + (r.totalTokens ?? 0), 0)

    return { avgLatency, successRate, totalTokens }
  }, [runs])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!runs || runs.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ minHeight: 'calc(100vh - 8rem)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No runs yet. Submit a task to see analytics.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1 — Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Runs" value={runs.length} />
        <StatCard
          label="Avg Latency"
          value={formatDuration(stats?.avgLatency)}
        />
        <StatCard
          label="Success Rate"
          value={stats?.successRate != null ? `${stats.successRate}%` : '—'}
        />
        <StatCard
          label="Total Tokens"
          value={stats?.totalTokens.toLocaleString() ?? '—'}
        />
      </div>

      {/* Row 2 — Latency + Status */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <LatencyChart runs={runs} />
        <StatusDonut runs={runs} />
      </div>

      {/* Row 3 — Token usage */}
      <TokenUsageChart runs={runs} />
    </div>
  )
}
