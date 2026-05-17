'use client'
import { useQuery } from '@tanstack/react-query'
import { getFailureSummary } from '@/lib/api'

export function useFailureSummary() {
  return useQuery({
    queryKey: ['failure-summary'],
    queryFn: getFailureSummary,
    refetchInterval: 10000,
  })
}
