'use client'

import { useQuery } from '@tanstack/react-query'
import { getAgents } from '@/lib/api'

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
    staleTime: Infinity,
  })
}
