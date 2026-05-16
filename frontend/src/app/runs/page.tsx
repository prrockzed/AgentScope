'use client'

import { useRuns } from '@/hooks/useRuns'
import { RunsTable } from '@/components/runs/RunsTable'

export default function RunsPage() {
  const { data, isLoading, error, refetch } = useRuns()

  return (
    <div className="flex flex-col gap-4">
      <RunsTable
        runs={data}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
      />
    </div>
  )
}
