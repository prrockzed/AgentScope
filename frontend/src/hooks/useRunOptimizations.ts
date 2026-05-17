import { useQuery } from '@tanstack/react-query'
import { getRunOptimizations } from '@/lib/api'

export function useRunOptimizations(runId: string) {
  return useQuery({
    queryKey: ['optimizations', 'run', runId],
    queryFn: () => getRunOptimizations(runId),
  })
}
