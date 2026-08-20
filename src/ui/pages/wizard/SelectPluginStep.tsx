import { useWizardStore } from '@ui/stores/wizard-store'

export function SelectPluginStep({ loading }: { loading: boolean }) {
  const plugins = useWizardStore((s) => s.plugins)
  const selectedPluginId = useWizardStore((s) => s.selectedPluginId)
  const selectPlugin = useWizardStore((s) => s.selectPlugin)
  const error = useWizardStore((s) => s.error)

  return (
    <div>
      <h2>Selecione o ERP de origem</h2>
      <p className="lead">Escolha o sistema de onde os dados serão lidos.</p>

      {error && <div className="banner error">{error}</div>}
      {loading && <p className="empty">Carregando plugins…</p>}

      <div className="card-list">
        {plugins.map((plugin) => (
          <button
            key={plugin.id}
            type="button"
            className={`plugin-card ${selectedPluginId === plugin.id ? 'selected' : ''}`}
            onClick={() => selectPlugin(plugin.id)}
          >
            <strong>
              {plugin.name} <span className="badge">v{plugin.version}</span>
            </strong>
            <p>{plugin.description}</p>
            <p>Entidades: {plugin.supportedEntities.join(', ')}</p>
          </button>
        ))}
      </div>

      {!loading && plugins.length === 0 && (
        <p className="empty">Nenhum plugin disponível.</p>
      )}
    </div>
  )
}
