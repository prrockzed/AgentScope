interface Props {
  label: string
  value: string | number
}

export function StatCard({ label, value }: Props) {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg p-5"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-custom)' }}
    >
      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  )
}
