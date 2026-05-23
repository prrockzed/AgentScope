import { useMutation, useQueryClient } from '@tanstack/react-query'
import { activatePatch, rejectPatch, revokePatch } from '@/lib/api'

export function usePatchAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'activate' | 'reject' | 'revoke' }) =>
      action === 'activate'
        ? activatePatch(id)
        : action === 'reject'
          ? rejectPatch(id)
          : revokePatch(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agent-patches'] })
    },
  })
}
