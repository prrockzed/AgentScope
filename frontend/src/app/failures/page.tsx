'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, ArrowRight } from 'lucide-react'
import { useFailureSummary } from '@/hooks/useFailureSummary'
import { useRuns } from '@/hooks/useRuns'
import { FailureBreakdownChart } from '@/components/failures/FailureBreakdownChart'
import { FailureTable } from '@/components/failures/FailureTable'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelativeTime, formatMs, truncateId } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg p-5"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
    >
      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg p-5"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
    >
      <Skeleton className="h-3 w-24 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      <Skeleton className="h-8 w-16 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
    </div>
  )
}

export default function FailuresPage() {
  const { data: summary, isLoading } = useFailureSummary()
  const { data: runs } = useRuns()
  const [selectedReason, setSelectedReason] = useState<string | null>(null)

  const totalFailed = summary?.reduce((sum, s) => sum + s.count, 0) ?? 0
  const mostCommon = summary?.[0]

  const affectedRuns = selectedReason
    ? (runs ?? []).filter((r) => r.failureReason === selectedReason)
    : []

  if (!isLoading && summary?.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No failures recorded yet.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1 — stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Total Failed Runs" value={totalFailed} />
            <StatCard label="Failure Types" value={summary?.length ?? 0} />
            <StatCard
              label="Most Common"
              value={mostCommon?.reason ?? '—'}
              sub={mostCommon ? `${mostCommon.count} occurrences` : undefined}
            />
          </>
        )}
      </div>

      {/* Row 2 — chart */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          {isLoading ? (
            <div
              className="rounded-lg p-5 flex flex-col gap-4"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
            >
              <Skeleton className="h-4 w-32 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
              <Skeleton className="h-32 w-full rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
            </div>
          ) : (
            <FailureBreakdownChart data={summary ?? []} />
          )}
        </div>
      </div>

      {/* Row 3 — table */}
      {!isLoading && summary && summary.length > 0 && (
        <FailureTable
          summary={summary}
          selectedReason={selectedReason}
          onSelect={setSelectedReason}
        />
      )}

      {/* Row 4 — affected runs panel */}
      {selectedReason && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--border-custom)' }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-custom)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Runs with{' '}
              <span className="font-mono" style={{ color: '#ef4444' }}>
                {selectedReason}
              </span>
            </p>
            <button
              onClick={() => setSelectedReason(null)}
              className="flex items-center justify-center w-6 h-6 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Close panel"
            >
              <X size={14} />
            </button>
          </div>

          {/* Affected runs table */}
          {affectedRuns.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No matching runs found.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow
                  style={{
                    borderBottom: '1px solid var(--border-custom)',
                    backgroundColor: 'var(--bg-surface)',
                  }}
                >
                  {['ID', 'Task', 'Created', 'Latency', ''].map((h) => (
                    <TableHead
                      key={h}
                      className="text-xs font-medium"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {affectedRuns.map((run) => (
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
                      className="max-w-[280px] truncate text-sm"
                      style={{ color: 'var(--text-primary)' }}
                      title={run.task ?? ''}
                    >
                      {run.task
                        ? run.task.length > 70
                          ? run.task.slice(0, 70) + '…'
                          : run.task
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {formatRelativeTime(run.createdAt)}
                    </TableCell>
                    <TableCell className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatMs(run.totalLatency)}
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
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  )
}
