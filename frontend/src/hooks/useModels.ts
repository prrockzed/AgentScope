'use client'

import { useQuery } from '@tanstack/react-query'
import { getModels } from '@/lib/api'

export function useModels() {
  return useQuery({ queryKey: ['models'], queryFn: getModels, staleTime: 30_000 })
}
