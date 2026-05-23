import { useQuery } from '@tanstack/react-query'
import { getRunAccuracyEval } from '@/lib/api'

export function useRunAccuracyEval(runId: string) {
  return useQuery({
    queryKey: ['accuracy-eval', runId],
    queryFn: () => getRunAccuracyEval(runId),
    refetchInterval: (q) => q.state.data?.evalStatus === 'PENDING' ? 2000 : false,
    retry: false,
  })
}
