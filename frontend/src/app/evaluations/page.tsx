'use client'

import { useState } from 'react'
import { useRegressionTests } from '@/hooks/useRegressionTests'
import { useRegressionResults } from '@/hooks/useRegressionResults'
import { RegressionTestsTable } from '@/components/evaluations/RegressionTestsTable'
import { RegressionResultsTable } from '@/components/evaluations/RegressionResultsTable'
import { Skeleton } from '@/components/ui/skeleton'

type Tab = 'tests' | 'comparisons'

export default function EvaluationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('tests')
  const { data: tests, isLoading: testsLoading } = useRegressionTests()
  const { data: results, isLoading: resultsLoading } = useRegressionResults()

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('tests')}
          className="text-sm px-4 py-1.5 rounded-full font-medium transition-colors"
          style={
            activeTab === 'tests'
              ? { backgroundColor: '#7c3aed', color: '#fff' }
              : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }
          }
        >
          Regression Tests
        </button>
        <button
          onClick={() => setActiveTab('comparisons')}
          className="text-sm px-4 py-1.5 rounded-full font-medium transition-colors"
          style={
            activeTab === 'comparisons'
              ? { backgroundColor: '#7c3aed', color: '#fff' }
              : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }
          }
        >
          Comparisons
        </button>
      </div>

      {activeTab === 'tests' && (
        <>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Regression tests created automatically from failed runs.
          </p>
          {testsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" style={{ backgroundColor: 'var(--bg-elevated)' }} />
              ))}
            </div>
          ) : (
            <RegressionTestsTable tests={tests ?? []} />
          )}
        </>
      )}

      {activeTab === 'comparisons' && (
        <>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Quantitative comparison between replayed runs and their baselines.
          </p>
          {resultsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" style={{ backgroundColor: 'var(--bg-elevated)' }} />
              ))}
            </div>
          ) : (
            <RegressionResultsTable results={results ?? []} />
          )}
        </>
      )}
    </div>
  )
}
