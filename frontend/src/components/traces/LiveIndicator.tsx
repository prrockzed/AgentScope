export function LiveIndicator() {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: 'var(--purple-400)' }}
        />
        <span
          className="relative inline-flex rounded-full h-2.5 w-2.5"
          style={{ backgroundColor: 'var(--purple-600)' }}
        />
      </span>
      <span className="text-xs font-medium" style={{ color: 'var(--purple-400)' }}>
        Live
      </span>
    </div>
  )
}
