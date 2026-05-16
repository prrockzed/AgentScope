import { useQuery } from '@tanstack/react-query'
import { isRunSaved } from '@/lib/api'

export function useIsRunSaved(runId: string) {
  return useQuery({
    queryKey: ['run-saved', runId],
    queryFn: () => isRunSaved(runId),
  })
}
