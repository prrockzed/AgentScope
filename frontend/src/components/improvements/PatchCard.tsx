'use client'

import Link from 'next/link'
import { formatRelativeTime, formatAgentType } from '@/lib/utils'
import { usePatchAction } from '@/hooks/usePatchAction'
import type { AgentPatch } from '@/types'

interface Props {
  patch: AgentPatch
}

export function PatchCard({ patch }: Props) {
  const action = usePatchAction()

  if (patch.status === 'GENERATING') {
    return (
      <div
        className="rounded-lg p-4 flex flex-col gap-3 animate-pulse"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
      >
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          <div className="h-5 w-28 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        </div>
        <div className="h-4 w-3/4 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        <div className="h-3 w-1/2 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Generating improvement…</p>
      </div>
    )
  }

  if (patch.status === 'FAILED') {
    return (
      <div
        className="rounded-lg p-4 flex flex-col gap-2"
        style={{ backgroundColor: '#4c0519', border: '1px solid #7f1d1d' }}
      >
        <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>Generation failed</p>
        {patch.errorMessage && (
          <p className="text-xs font-mono" style={{ color: '#fca5a5' }}>{patch.errorMessage}</p>
        )}
      </div>
    )
  }

  if (patch.status === 'PENDING') {
    return (
      <div
        className="rounded-lg p-4 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="rounded px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          >
            {formatAgentType(patch.agentType)}
          </span>
          <span
            className="rounded px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: '#451a03', color: '#fbbf24', border: '1px solid #78350f' }}
          >
            Pending Review
          </span>
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
            {formatRelativeTime(patch.createdAt)}
          </span>
        </div>

        {patch.title && (
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {patch.title}
          </p>
        )}
        {patch.instruction && (
          <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
            {patch.instruction}
          </p>
        )}
        {patch.rationale && (
          <p className="text-xs italic" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            {patch.rationale}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {patch.sourceRunId && (
            <Link
              href={`/runs/${patch.sourceRunId}`}
              className="text-xs hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              From run {patch.sourceRunId.slice(0, 8)}
            </Link>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              disabled={action.isPending}
              onClick={() => action.mutate({ id: patch.id, action: 'activate' })}
              className="rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#14291a', color: '#4ade80', border: '1px solid #166534' }}
            >
              Activate
            </button>
            <button
              disabled={action.isPending}
              onClick={() => action.mutate({ id: patch.id, action: 'reject' })}
              className="rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-custom)' }}
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (patch.status === 'ACTIVE') {
    return (
      <div
        className="rounded-lg p-4 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid #166534' }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="rounded px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          >
            {formatAgentType(patch.agentType)}
          </span>
          <span
            className="rounded px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: '#14291a', color: '#4ade80', border: '1px solid #166534' }}
          >
            Active
          </span>
          {patch.activatedAt && (
            <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
              Activated {formatRelativeTime(patch.activatedAt)}
            </span>
          )}
        </div>

        {patch.title && (
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {patch.title}
          </p>
        )}
        {patch.instruction && (
          <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
            {patch.instruction}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {patch.sourceRunId && (
            <Link
              href={`/runs/${patch.sourceRunId}`}
              className="text-xs hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              From run {patch.sourceRunId.slice(0, 8)}
            </Link>
          )}
          <button
            disabled={action.isPending}
            onClick={() => action.mutate({ id: patch.id, action: 'revoke' })}
            className="rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            style={{ backgroundColor: '#451a03', color: '#fbbf24', border: '1px solid #78350f' }}
          >
            Revoke
          </button>
        </div>
      </div>
    )
  }

  // REJECTED or REVOKED
  const isRevoked = patch.status === 'REVOKED'
  const timestampField = isRevoked ? patch.revokedAt : patch.rejectedAt
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3 opacity-60"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="rounded px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          {formatAgentType(patch.agentType)}
        </span>
        <span
          className="rounded px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-custom)' }}
        >
          {isRevoked ? 'Revoked' : 'Rejected'}
        </span>
        {timestampField && (
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
            {formatRelativeTime(timestampField)}
          </span>
        )}
      </div>

      {patch.title && (
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {patch.title}
        </p>
      )}
      {patch.instruction && (
        <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
          {patch.instruction}
        </p>
      )}

      {patch.sourceRunId && (
        <Link
          href={`/runs/${patch.sourceRunId}`}
          className="text-xs hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          From run {patch.sourceRunId.slice(0, 8)}
        </Link>
      )}
    </div>
  )
}
