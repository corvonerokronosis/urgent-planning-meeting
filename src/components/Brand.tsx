export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <span className="brand__mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span className="brand__name">Контур</span>
      {!compact ? <span className="brand__descriptor">рабочий мессенджер</span> : null}
    </div>
  )
}
