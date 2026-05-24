import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelRun } from '@/lib/api'

export function useCancelRun(runId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => cancelRun(runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['runs', runId] })
    },
  })
}
