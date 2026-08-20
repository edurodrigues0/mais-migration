import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { migrationApi } from '@ui/lib/api'
import { useWizardStore } from '@ui/stores/wizard-store'
import { SelectPluginStep } from '@ui/pages/wizard/SelectPluginStep'
import { ConnectStep } from '@ui/pages/wizard/ConnectStep'
import { RunningStep } from '@ui/pages/wizard/RunningStep'
import { PreviewStep } from '@ui/pages/wizard/PreviewStep'
import { ReportStep } from '@ui/pages/wizard/ReportStep'

const STEP_LABELS: Record<string, string> = {
  select: 'Selecionar ERP',
  connect: 'Conectar',
  running: 'Processar',
  preview: 'Pré-visualizar',
  report: 'Relatório'
}

export function WizardPage() {
  const step = useWizardStore((s) => s.step)
  const setPlugins = useWizardStore((s) => s.setPlugins)
  const pushProgress = useWizardStore((s) => s.pushProgress)
  const setError = useWizardStore((s) => s.setError)

  const pluginsQuery = useQuery({
    queryKey: ['plugins'],
    queryFn: () => migrationApi.listPlugins()
  })

  useEffect(() => {
    if (pluginsQuery.data) setPlugins(pluginsQuery.data)
  }, [pluginsQuery.data, setPlugins])

  useEffect(() => {
    return migrationApi.onProgress((event) => pushProgress(event))
  }, [pushProgress])

  useEffect(() => {
    if (pluginsQuery.error) {
      setError(pluginsQuery.error instanceof Error ? pluginsQuery.error.message : String(pluginsQuery.error))
    }
  }, [pluginsQuery.error, setError])

  const order = ['select', 'connect', 'running', 'preview', 'report'] as const
  const currentIndex = order.indexOf(step)

  return (
    <section className="panel">
      <h1>Assistente de migração</h1>
      <p className="lead">
        Siga os passos para migrar dados de um ERP de origem para o destino MAIS. Não é necessário
        conhecimento de banco de dados.
      </p>

      <div className="steps">
        {order.map((key, index) => (
          <span
            key={key}
            className={`step-chip ${index === currentIndex ? 'active' : ''} ${
              index < currentIndex ? 'done' : ''
            }`}
          >
            {index + 1}. {STEP_LABELS[key]}
          </span>
        ))}
      </div>

      {step === 'select' && <SelectPluginStep loading={pluginsQuery.isLoading} />}
      {step === 'connect' && <ConnectStep />}
      {step === 'running' && <RunningStep />}
      {step === 'preview' && <PreviewStep />}
      {step === 'report' && <ReportStep />}
    </section>
  )
}
