'use client'

import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { RunStatusBadge } from '@/components/runs/RunStatusBadge'
import { useSavedRuns } from '@/hooks/useSavedRuns'
import { useUnsaveRun } from '@/hooks/useUnsaveRun'
import { useReplayRun } from '@/hooks/useReplayRun'
import { formatMs, formatRelativeTime, truncateId } from '@/lib/utils'

function SkeletonRow() {
  return (
    <TableRow style={{ borderBottom: '1px solid var(--border-custom)' }}>
      {[...Array(7)].map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-full rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        </TableCell>
      ))}
    </TableRow>
  )
}

export default function SavedRunsPage() {
  const router = useRouter()
  const { data: savedRuns, isLoading } = useSavedRuns()
  const unsave = useUnsaveRun()
  const replay = useReplayRun()

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--border-custom)' }}
      >
        <Table>
          <TableHeader>
            <TableRow style={{ borderBottom: '1px solid var(--border-custom)', backgroundColor: 'var(--bg-surface)' }}>
              {['ID', 'Task', 'Status', 'Latency', 'Tokens', 'Saved At', 'Actions'].map((h) => (
                <TableHead key={h} className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
            ) : !savedRuns || savedRuns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                  No saved runs yet. Save a run from its trace viewer page.
                </TableCell>
              </TableRow>
            ) : (
              savedRuns.map((saved) => (
                <TableRow
                  key={saved.savedRunId}
                  onClick={() => router.push(`/runs/${saved.runId}`)}
                  className="transition-colors cursor-pointer"
                  style={{ borderBottom: '1px solid var(--border-custom)' }}
                >
                  <TableCell
                    className="font-mono text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {truncateId(saved.runId)}
                  </TableCell>
                  <TableCell
                    className="max-w-[220px] truncate text-sm"
                    style={{ color: 'var(--text-primary)' }}
                    title={saved.task ?? ''}
                  >
                    {saved.task
                      ? saved.task.length > 50
                        ? saved.task.slice(0, 50) + '…'
                        : saved.task
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </TableCell>
                  <TableCell>
                    {saved.status
                      ? <RunStatusBadge status={saved.status} />
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                    {formatMs(saved.totalLatency)}
                  </TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                    {saved.totalTokens ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {formatRelativeTime(saved.savedAt)}
                  </TableCell>
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        disabled={replay.isPending}
                        onClick={() =>
                          replay.mutate(saved.runId, {
                            onSuccess: (newRun) => router.push(`/runs/${newRun.id}`),
                          })
                        }
                        className="rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                      >
                        Run
                      </button>
                      <button
                        disabled={unsave.isPending}
                        onClick={() => unsave.mutate(saved.runId)}
                        className="rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: '#3b1a1a', color: '#ef4444' }}
                      >
                        Unsave
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
