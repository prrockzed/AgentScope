'use client'

import { useKnowledgeSummary } from '@/hooks/useKnowledgeSummary'
import { ModelInsightsTable } from '@/components/knowledge/ModelInsightsTable'
import { OptimizationLearningsTable } from '@/components/knowledge/OptimizationLearningsTable'
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

export default function KnowledgePage() {
  const { data, isLoading } = useKnowledgeSummary()

  return (
    <div className="flex flex-col gap-8 max-w-6xl">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Knowledge</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Aggregate stats derived from completed runs. Model Insights and Optimization Learnings are also injected as context into every future run automatically.
        </p>
      </div>

      {/* Model Insights */}
      <div className="flex flex-col gap-3">
        <div className="pl-3 py-0.5" style={{ borderLeft: '3px solid #3b82f6' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Model Insights</h2>
        </div>
        {isLoading ? (
          <SectionSkeleton />
        ) : (
          <ModelInsightsTable data={data?.modelInsights ?? []} />
        )}
      </div>

      {/* Optimization Learnings */}
      <div className="flex flex-col gap-3">
        <div className="pl-3 py-0.5" style={{ borderLeft: '3px solid #f59e0b' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Optimization Learnings</h2>
        </div>
        {isLoading ? (
          <SectionSkeleton />
        ) : (
          <OptimizationLearningsTable data={data?.optimizationLearnings ?? []} />
        )}
      </div>
    </div>
  )
}
