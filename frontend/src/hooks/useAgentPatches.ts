import { useQuery } from '@tanstack/react-query'
import { getAgentPatches } from '@/lib/api'

export function useAgentPatches() {
  return useQuery({
    queryKey: ['agent-patches'],
    queryFn: getAgentPatches,
    refetchInterval: (q) =>
      q.state.data?.some((p) => p.status === 'GENERATING') ? 2000 : false,
  })
}
