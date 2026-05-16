import { useMutation, useQueryClient } from '@tanstack/react-query'
import { replayRun } from '@/lib/api'

export function useReplayRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => replayRun(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['runs'] }),
  })
}
