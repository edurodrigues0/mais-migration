import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWizardStore } from '@ui/stores/wizard-store'
import { migrationApi } from '@ui/lib/api'

export function PreviewStep() {
  const preview = useWizardStore((s) => s.preview)
  const setStep = useWizardStore((s) => s.setStep)
  const setBusy = useWizardStore((s) => s.setBusy)
  const setError = useWizardStore((s) => s.setError)
  const setReport = useWizardStore((s) => s.setReport)
  const clearProgress = useWizardStore((s) => s.clearProgress)
  const empresas = useWizardStore((s) => s.empresas)
  const setEmpresas = useWizardStore((s) => s.setEmpresas)
  const selectedEmpresaId = useWizardStore((s) => s.selectedEmpresaId)
  const setSelectedEmpresaId = useWizardStore((s) => s.setSelectedEmpresaId)
  const busy = useWizardStore((s) => s.busy)
  const error = useWizardStore((s) => s.error)

  const empresasQuery = useQuery({
    queryKey: ['empresas'],
    queryFn: () => migrationApi.listEmpresas(),
    enabled: Boolean(preview)
  })

  useEffect(() => {
    if (empresasQuery.data) {
      setEmpresas(empresasQuery.data)
      if (!selectedEmpresaId && empresasQuery.data.length === 1) {
        setSelectedEmpresaId(empresasQuery.data[0].id)
      }
    }
  }, [empresasQuery.data, selectedEmpresaId, setEmpresas, setSelectedEmpresaId])

  useEffect(() => {
    if (empresasQuery.error) {
      setError(
        empresasQuery.error instanceof Error
          ? empresasQuery.error.message
          : String(empresasQuery.error)
      )
    }
  }, [empresasQuery.error, setError])

  if (!preview) {
    return <p className="empty">Nenhuma pré-visualização disponível.</p>
  }

  async function handleImport() {
    if (!selectedEmpresaId) {
      setError('Selecione a empresa de destino no Mais Gestão')
      return
    }
    setError(null)
    clearProgress()
    setBusy(true)
    setStep('running')
    try {
      const report = await migrationApi.confirmImport(preview!.jobId, selectedEmpresaId)
      setReport(report)
      setStep('report')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStep('preview')
    } finally {
      setBusy(false)
    }
  }

  const lista = empresasQuery.data ?? empresas

  return (
    <div>
      <h2>Pré-visualização</h2>
      <p className="lead">
        Revise os dados e selecione a empresa do Mais Gestão que receberá a importação.
      </p>

      {error && <div className="banner error">{error}</div>}

      <div className="field">
        <label htmlFor="empresa">Empresa de destino (Mais Gestão)</label>
        {empresasQuery.isLoading ? (
          <p className="empty">Carregando empresas do Postgres…</p>
        ) : (
          <select
            id="empresa"
            value={selectedEmpresaId ?? ''}
            onChange={(e) => setSelectedEmpresaId(e.target.value || null)}
            disabled={busy || lista.length === 0}
          >
            <option value="">Selecione…</option>
            {lista.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
                {empresa.cnpj ? ` — ${empresa.cnpj}` : ''}
              </option>
            ))}
          </select>
        )}
        {!empresasQuery.isLoading && lista.length === 0 && (
          <p className="empty">Nenhuma empresa encontrada em empresas no Postgres.</p>
        )}
      </div>

      <div className="counters">
        {preview.counters.map((counter) => (
          <div className="counter" key={counter.kind}>
            <strong>{counter.total}</strong>
            <span>{counter.kind}</span>
            {counter.warnings > 0 && <span>{counter.warnings} avisos</span>}
          </div>
        ))}
      </div>

      {preview.warnings.length > 0 && (
        <div className="banner warn">
          {preview.warnings.slice(0, 5).map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
          {preview.warnings.length > 5 && <div>+{preview.warnings.length - 5} avisos…</div>}
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>ID origem</th>
              <th>Dados</th>
              <th>Avisos</th>
            </tr>
          </thead>
          <tbody>
            {preview.sample.map((entity) => (
              <tr key={`${entity.kind}-${entity.externalId}`}>
                <td>{entity.kind}</td>
                <td>{entity.externalId}</td>
                <td>
                  <code>{JSON.stringify(entity.payload)}</code>
                </td>
                <td>{entity.warnings.join('; ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="actions">
        <button type="button" className="btn secondary" onClick={() => setStep('connect')} disabled={busy}>
          Voltar
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleImport}
          disabled={busy || !selectedEmpresaId || lista.length === 0}
        >
          Confirmar importação
        </button>
      </div>
    </div>
  )
}
