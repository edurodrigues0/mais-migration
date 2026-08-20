import { useWizardStore } from '@ui/stores/wizard-store'
import { latestProgress, progressPercent } from '@shared/progress'

export function RunningStep() {
  const progress = useWizardStore((s) => s.progress)
  const last = latestProgress(progress)
  const pct = progressPercent(last)
  const recent = progress.slice(-8)

  return (
    <div>
      <h2>Processando migração</h2>
      <p className="lead">Aguarde enquanto os dados são lidos, mapeados e validados.</p>

      <div
        className="progress-meter"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
        aria-label="Progresso da migração"
      >
        <div className="progress-meter-track">
          <div
            className={`progress-meter-fill${pct == null ? ' is-indeterminate' : ''}`}
            style={pct != null ? { width: `${pct}%` } : undefined}
          />
        </div>
        <div className="progress-meter-label">
          {pct != null && last?.total != null
            ? `${pct}% — ${last.processed} de ${last.total}`
            : last?.message ?? 'Iniciando…'}
        </div>
      </div>

      {last?.message && pct != null ? <p className="progress-status">{last.message}</p> : null}

      <div className="progress-log">
        {recent.length === 0 && <div>Iniciando…</div>}
        {recent.map((item, index) => (
          <div key={`${item.stage}-${index}`}>
            [{item.stage}] {item.message}
            {item.processed > 0 ? ` (${item.processed})` : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
