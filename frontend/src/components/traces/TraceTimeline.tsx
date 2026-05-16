import { TraceStepCard } from './TraceStepCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { TraceStep } from '@/types'

function SkeletonStep() {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <Skeleton className="h-6 w-6 rounded-full" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        <Skeleton className="w-0.5 flex-1 mt-2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      </div>
      <div className="flex-1 pb-4">
        <Skeleton className="h-16 w-full rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      </div>
    </div>
  )
}

interface Props {
  steps: TraceStep[]
  isLoading: boolean
  liveStepIds?: Set<string>
}

export function TraceTimeline({ steps, isLoading, liveStepIds }: Props) {
  if (isLoading && steps.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(3)].map((_, i) => <SkeletonStep key={i} />)}
      </div>
    )
  }

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
        No trace steps yet.
      </div>
    )
  }

  return (
    <div className="relative flex flex-col gap-2">
      {/* Vertical line */}
      <div
        className="absolute left-[11px] top-3 bottom-3 w-0.5"
        style={{ backgroundColor: 'var(--border-custom)' }}
      />
      {steps.map((step) => (
        <div key={step.id} className="pl-9 relative">
          {/* Dot on the line */}
          <div
            className="absolute left-2 top-3 h-2.5 w-2.5 rounded-full border-2"
            style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--purple-600)' }}
          />
          <TraceStepCard step={step} isNew={liveStepIds?.has(step.id)} />
        </div>
      ))}
    </div>
  )
}
