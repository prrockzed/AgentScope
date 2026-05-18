'use client'

import { useMemoryPatterns } from '@/hooks/useMemoryPatterns'
import { SuccessfulPatternsTable } from '@/components/memory/SuccessfulPatternsTable'
import { FailurePatternsTable } from '@/components/memory/FailurePatternsTable'
import { Skeleton } from '@/components/ui/skeleton'

function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      ))}
    </div>
  )
}

export default function MemoryPage() {
  const { data, isLoading } = useMemoryPatterns()

  return (
    <div className="flex flex-col gap-8 max-w-6xl">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Memory</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Operational patterns learned from completed agent runs.
        </p>
      </div>

      {/* Successful Patterns */}
      <div className="flex flex-col gap-3">
        <div
          className="pl-3 py-0.5"
          style={{ borderLeft: '3px solid #22c55e' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Successful Patterns</h2>
        </div>
        {isLoading ? (
          <SectionSkeleton />
        ) : (
          <SuccessfulPatternsTable data={data?.successfulPatterns ?? []} />
        )}
      </div>

      {/* Failure Patterns */}
      <div className="flex flex-col gap-3">
        <div
          className="pl-3 py-0.5"
          style={{ borderLeft: '3px solid #ef4444' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Failure Patterns</h2>
        </div>
        {isLoading ? (
          <SectionSkeleton />
        ) : (
          <FailurePatternsTable data={data?.failurePatterns ?? []} />
        )}
      </div>
    </div>
  )
}
