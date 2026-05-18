'use client'

import { useQuery } from '@tanstack/react-query'
import { getAgentDetail } from '@/lib/api'

export function useAgentDetail(id: string | null) {
  return useQuery({
    queryKey: ['agent-detail', id],
    queryFn: () => getAgentDetail(id!),
    enabled: id !== null,
    staleTime: Infinity,
  })
}
