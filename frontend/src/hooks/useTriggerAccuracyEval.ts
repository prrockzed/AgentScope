import { useMutation, useQueryClient } from '@tanstack/react-query'
import { triggerAccuracyEval } from '@/lib/api'

export function useTriggerAccuracyEval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ runId, evaluatorModel }: { runId: string; evaluatorModel: string }) =>
      triggerAccuracyEval(runId, evaluatorModel),
    onSuccess: (_, { runId }) => {
      void queryClient.invalidateQueries({ queryKey: ['accuracy-eval', runId] })
    },
  })
}
