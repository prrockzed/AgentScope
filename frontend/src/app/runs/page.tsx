'use client'

import { useRuns } from '@/hooks/useRuns'
import { RunsTable } from '@/components/runs/RunsTable'
import { RunsActivityChart } from '@/components/runs/RunsActivityChart'

export default function RunsPage() {
  const { data, isLoading, error, refetch } = useRuns()

  return (
    <div className="flex flex-col gap-4">
      <RunsActivityChart
        runs={data}
        isLoading={isLoading}
        onRefresh={() => void refetch()}
      />
      <RunsTable
        runs={data}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
      />
    </div>
  )
}
