'use client'

import { useRegressionTests } from '@/hooks/useRegressionTests'
import { RegressionTestsTable } from '@/components/evaluations/RegressionTestsTable'
import { Skeleton } from '@/components/ui/skeleton'

export default function EvaluationsPage() {
  const { data: tests, isLoading } = useRegressionTests()

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Regression tests created automatically from failed runs.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          ))}
        </div>
      ) : (
        <RegressionTestsTable tests={tests ?? []} />
      )}
    </div>
  )
}
