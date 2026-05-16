'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
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
import type { AgentRun } from '@/types'

const PAGE_SIZES = [10, 20, 50]

function SkeletonRow() {
  return (
    <TableRow style={{ borderBottom: '1px solid var(--border-custom)' }}>
      {[...Array(6)].map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        </TableCell>
      ))}
    </TableRow>
  )
}

interface Props {
  runs: AgentRun[] | undefined
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}

export function RunsTable({ runs, isLoading, error, onRetry }: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  // Reset to first page whenever the run list changes or page size changes
  useEffect(() => {
    setCurrentPage(1)
  }, [runs?.length, pageSize])

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

  const totalPages = runs ? Math.ceil(runs.length / pageSize) : 1
  const pageRuns = runs ? runs.slice((currentPage - 1) * pageSize, currentPage * pageSize) : []

  return (
    <div className="flex flex-col gap-0">
      <div
        className="rounded-t-lg overflow-hidden"
        style={{ border: '1px solid var(--border-custom)', borderBottom: 'none' }}
      >
        <Table>
          <TableHeader>
            <TableRow style={{ borderBottom: '1px solid var(--border-custom)', backgroundColor: 'var(--bg-surface)' }}>
              {['ID', 'Task', 'Status', 'Created', 'Latency', 'Tokens', ''].map((h) => (
                <TableHead key={h} className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
            ) : !runs || runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                  No runs yet. Submit your first task above.
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
                    {run.task ? (run.task.length > 60 ? run.task.slice(0, 60) + '…' : run.task) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
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
      {!isLoading && runs && runs.length > 0 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-b-lg"
          style={{ border: '1px solid var(--border-custom)', backgroundColor: 'var(--bg-surface)' }}
        >
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, runs.length)} of {runs.length} runs
          </span>
          <div className="flex items-center gap-3">
            {/* Page size selector */}
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
  )
}
