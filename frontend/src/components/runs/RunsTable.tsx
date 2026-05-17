'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { RunStatusBadge } from './RunStatusBadge'
import { formatMs, formatRelativeTime, truncateId } from '@/lib/utils'
import type { AgentRun, RunStatus } from '@/types'

const PAGE_SIZES = [10, 20, 50]

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

function activeFilterCount(f: Filters) {
  return [f.status, f.createdFrom, f.createdTo, f.latencyMin, f.latencyMax, f.tokensMin, f.tokensMax]
    .filter(Boolean).length
}

function formatAgentType(agentType: string | null): string {
  if (!agentType) return '—'
  return agentType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function SkeletonRow() {
  return (
    <TableRow style={{ borderBottom: '1px solid var(--border-custom)' }}>
      {[...Array(8)].map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        </TableCell>
      ))}
    </TableRow>
  )
}

const inputStyle = {
  backgroundColor: 'var(--bg-base)',
  border: '1px solid var(--border-custom)',
  color: 'var(--text-primary)',
}

interface Props {
  runs: AgentRun[] | undefined
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}

export function RunsTable({ runs, isLoading, error, onRetry }: Props) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const filteredRuns = useMemo(() => {
    if (!runs) return []
    const q = search.trim().toLowerCase()
    return runs.filter((run) => {
      if (q && !run.task?.toLowerCase().includes(q)) return false
      if (filters.status && run.status !== filters.status) return false
      if (filters.createdFrom && new Date(run.createdAt) < new Date(filters.createdFrom)) return false
      if (filters.createdTo) {
        const to = new Date(filters.createdTo)
        to.setDate(to.getDate() + 1) // inclusive end
        if (new Date(run.createdAt) >= to) return false
      }
      if (filters.latencyMin && (run.totalLatency ?? 0) < Number(filters.latencyMin)) return false
      if (filters.latencyMax && (run.totalLatency ?? 0) > Number(filters.latencyMax)) return false
      if (filters.tokensMin && (run.totalTokens ?? 0) < Number(filters.tokensMin)) return false
      if (filters.tokensMax && (run.totalTokens ?? 0) > Number(filters.tokensMax)) return false
      return true
    })
  }, [runs, search, filters])

  // Reset to page 1 when search/filter/page-size changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filters, pageSize])

  const totalPages = Math.max(1, Math.ceil(filteredRuns.length / pageSize))
  const pageRuns = filteredRuns.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const activeCount = activeFilterCount(filters)
  const hasAnyFilter = activeCount > 0 || search.trim() !== ''

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function clearAll() {
    setSearch('')
    setFilters(EMPTY_FILTERS)
  }

  if (error) {
    return (
      <div
        className="rounded-lg p-4 flex items-center justify-between"
        style={{ backgroundColor: '#4c0519', border: '1px solid #ef4444' }}
      >
        <span className="text-sm" style={{ color: '#ef4444' }}>
          Failed to load runs: {error.message}
        </span>
        <button
          onClick={onRetry}
          className="text-sm font-medium underline"
          style={{ color: '#ef4444' }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search + filter bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Task count */}
          {!isLoading && (
            <span
              className="rounded-md px-3 py-2 text-sm whitespace-nowrap"
              style={{ ...inputStyle, color: 'var(--text-muted)' }}
            >
              Tasks: {filteredRuns.length}
            </span>
          )}

          {/* Search input */}
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md pl-8 pr-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          {/* Filters toggle */}
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            style={
              filtersOpen || activeCount > 0
                ? { backgroundColor: 'var(--purple-600)', color: 'white' }
                : { ...inputStyle, color: 'var(--text-muted)' }
            }
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeCount > 0 && (
              <span
                className="flex items-center justify-center rounded-full w-4 h-4 text-[10px] font-bold"
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
              >
                {activeCount}
              </span>
            )}
          </button>

          {/* Clear all */}
          {hasAnyFilter && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--text-muted)', ...inputStyle }}
            >
              <X size={13} />
              Clear
            </button>
          )}

        </div>

        {/* Filter panel */}
        {filtersOpen && (
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

            {/* Created between */}
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

            {/* Latency */}
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

            {/* Tokens */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tokens</span>
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
        )}
      </div>

      {/* Table */}
      <div className="flex flex-col gap-0">
        <div
          className="rounded-t-lg overflow-hidden"
          style={{ border: '1px solid var(--border-custom)', borderBottom: 'none' }}
        >
          <Table>
            <TableHeader>
              <TableRow style={{ borderBottom: '1px solid var(--border-custom)', backgroundColor: 'var(--bg-surface)' }}>
                {['ID', 'Task', 'Status', 'Created', 'Latency', 'Tokens', 'Model', 'Agent', ''].map((h) => (
                  <TableHead key={h} className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
              ) : filteredRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                    {hasAnyFilter ? 'No runs match your search or filters.' : 'No runs yet. Submit your first task above.'}
                  </TableCell>
                </TableRow>
              ) : (
                pageRuns.map((run) => (
                  <TableRow
                    key={run.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border-custom)' }}
                  >
                    <TableCell
                      className="font-mono text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {truncateId(run.id)}
                    </TableCell>
                    <TableCell
                      className="max-w-[240px] truncate text-sm"
                      style={{ color: 'var(--text-primary)' }}
                      title={run.task ?? ''}
                    >
                      {run.task ? (
                        <Link
                          href={`/runs/${run.id}`}
                          className="hover:underline"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {run.task.length > 60 ? run.task.slice(0, 60) + '…' : run.task}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <RunStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {formatRelativeTime(run.createdAt)}
                    </TableCell>
                    <TableCell className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatMs(run.totalLatency)}
                    </TableCell>
                    <TableCell className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                      {run.totalTokens ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                      {run.model ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatAgentType(run.agentType)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/runs/${run.id}`}
                        className="flex items-center justify-center"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!isLoading && filteredRuns.length > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-b-lg"
            style={{ border: '1px solid var(--border-custom)', backgroundColor: 'var(--bg-surface)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredRuns.length)} of {filteredRuns.length} runs
              {hasAnyFilter && runs && filteredRuns.length !== runs.length && (
                <span> (filtered from {runs.length})</span>
              )}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Rows</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="text-xs rounded px-1.5 py-1 outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-custom)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center w-7 h-7 rounded transition-colors disabled:opacity-30"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs px-2" style={{ color: 'var(--text-primary)' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center justify-center w-7 h-7 rounded transition-colors disabled:opacity-30"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
