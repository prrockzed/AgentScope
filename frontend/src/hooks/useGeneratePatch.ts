import { useMutation, useQueryClient } from '@tanstack/react-query'
import { generatePatch } from '@/lib/api'

export function useGeneratePatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => generatePatch(runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agent-patches'] })
    },
  })
}
