import { useWizardStore } from '@ui/stores/wizard-store'

export function ReportStep() {
  const report = useWizardStore((s) => s.report)
  const reset = useWizardStore((s) => s.reset)

  if (!report) {
    return <p className="empty">Nenhum relatório disponível.</p>
  }

  return (
    <div>
      <h2>Relatório</h2>
      <div className="banner ok">{report.summary}</div>

      <div className="counters">
        {report.counters.map((counter) => (
          <div className="counter" key={counter.kind}>
            <strong>{counter.imported}</strong>
            <span>{counter.kind} importados</span>
          </div>
        ))}
      </div>

      <div className="info-block">
        <p>
          <strong>Job:</strong> {report.jobId}
        </p>
        <p>
          <strong>Plugin:</strong> {report.pluginId}
        </p>
        <p>
          <strong>Duração:</strong> {report.durationMs} ms
        </p>
        <p>
          <strong>Status:</strong> {report.status}
        </p>
      </div>

      <div className="actions">
        <button type="button" className="btn" onClick={() => reset()}>
          Nova migração
        </button>
      </div>
    </div>
  )
}
