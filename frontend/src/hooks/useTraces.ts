'use client'

import { useQuery } from '@tanstack/react-query'
import { getTraces } from '@/lib/api'

export function useTraces(runId: string, isRunning: boolean) {
  return useQuery({
    queryKey: ['traces', runId],
    queryFn: () => getTraces(runId),
    refetchInterval: isRunning ? 3000 : false,
    enabled: !!runId,
  })
}
