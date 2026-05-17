'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useRuns } from '@/hooks/useRuns'
import { formatDuration } from '@/lib/utils'
import { StatCard } from '@/components/analytics/StatCard'
import { LatencyChart } from '@/components/analytics/LatencyChart'
import { TokenUsageChart } from '@/components/analytics/TokenUsageChart'
import { StatusDonut } from '@/components/analytics/StatusDonut'
import { Skeleton } from '@/components/ui/skeleton'
import type { RunStatus } from '@/types'

const STATUS_OPTIONS: RunStatus[] = ['RUNNING', 'SUCCESS', 'FAILED']

interface Filters {
  status: RunStatus | ''
  createdFrom: string
  createdTo: string
  latencyMin: string
  latencyMax: string
  tokensMin: string
  tokensMax: string
}

const EMPTY_FILTERS: Filters = {
  status: '',
  createdFrom: '',
  createdTo: '',
  latencyMin: '',
  latencyMax: '',
  tokensMin: '',
  tokensMax: '',
}

const inputStyle = {
  backgroundColor: 'var(--bg-base)',
  border: '1px solid var(--border-custom)',
  color: 'var(--text-primary)',
}

function activeFilterCount(f: Filters) {
  return [f.status, f.createdFrom, f.createdTo, f.latencyMin, f.latencyMax, f.tokensMin, f.tokensMax]
    .filter(Boolean).length
}

export default function AnalyticsPage() {
  const { data: runs, isLoading } = useRuns()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filteredRuns = useMemo(() => {
    if (!runs) return []
    return runs.filter((run) => {
      if (filters.status && run.status !== filters.status) return false
      if (filters.createdFrom && new Date(run.createdAt) < new Date(filters.createdFrom)) return false
      if (filters.createdTo) {
        const to = new Date(filters.createdTo)
        to.setDate(to.getDate() + 1)
        if (new Date(run.createdAt) >= to) return false
      }
      if (filters.latencyMin && (run.totalLatency ?? 0) < Number(filters.latencyMin)) return false
      if (filters.latencyMax && (run.totalLatency ?? 0) > Number(filters.latencyMax)) return false
      if (filters.tokensMin && (run.totalTokens ?? 0) < Number(filters.tokensMin)) return false
      if (filters.tokensMax && (run.totalTokens ?? 0) > Number(filters.tokensMax)) return false
      return true
    })
  }, [runs, filters])

  const stats = useMemo(() => {
    if (filteredRuns.length === 0) return null
    const completed = filteredRuns.filter((r) => r.status !== 'RUNNING' && r.totalLatency != null)
    const avgLatency =
      completed.length > 0
        ? Math.round(completed.reduce((sum, r) => sum + (r.totalLatency ?? 0), 0) / completed.length)
        : null
    const successRate =
      filteredRuns.length > 0
        ? Math.round((filteredRuns.filter((r) => r.status === 'SUCCESS').length / filteredRuns.length) * 100)
        : null
    const totalTokens = filteredRuns.reduce((sum, r) => sum + (r.totalTokens ?? 0), 0)

    return { avgLatency, successRate, totalTokens }
  }, [filteredRuns])

  const isFiltered = activeFilterCount(filters) > 0

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
      {/* Filters */}
      <div
        className="rounded-md p-4 grid grid-cols-2 gap-x-6 gap-y-4"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
      >
        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</span>
          <div className="flex items-center gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter('status', filters.status === s ? '' : s)}
                className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={
                  filters.status === s
                    ? { backgroundColor: 'var(--purple-600)', color: 'white' }
                    : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Created between</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.createdFrom}
              onChange={(e) => setFilter('createdFrom', e.target.value)}
              className="flex-1 rounded px-2 py-1 text-xs outline-none"
              style={inputStyle}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>–</span>
            <input
              type="date"
              value={filters.createdTo}
              onChange={(e) => setFilter('createdTo', e.target.value)}
              className="flex-1 rounded px-2 py-1 text-xs outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Latency range */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Latency (ms)</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              placeholder="Min"
              value={filters.latencyMin}
              onChange={(e) => setFilter('latencyMin', e.target.value)}
              className="flex-1 rounded px-2 py-1 text-xs outline-none"
              style={inputStyle}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>–</span>
            <input
              type="number"
              min={0}
              placeholder="Max"
              value={filters.latencyMax}
              onChange={(e) => setFilter('latencyMax', e.target.value)}
              className="flex-1 rounded px-2 py-1 text-xs outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Token range + clear */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tokens</span>
            {isFiltered && (
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={11} />
                Clear filters
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              placeholder="Min"
              value={filters.tokensMin}
              onChange={(e) => setFilter('tokensMin', e.target.value)}
              className="flex-1 rounded px-2 py-1 text-xs outline-none"
              style={inputStyle}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>–</span>
            <input
              type="number"
              min={0}
              placeholder="Max"
              value={filters.tokensMax}
              onChange={(e) => setFilter('tokensMax', e.target.value)}
              className="flex-1 rounded px-2 py-1 text-xs outline-none"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Empty filtered state */}
      {filteredRuns.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No runs match the current filters.
          </p>
        </div>
      ) : (
        <>
          {/* Row 1 — Stat cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total Runs" value={filteredRuns.length} />
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
            <LatencyChart runs={filteredRuns} />
            <StatusDonut runs={filteredRuns} />
          </div>

          {/* Row 3 — Token usage */}
          <TokenUsageChart runs={filteredRuns} />
        </>
      )}
    </div>
  )
}
