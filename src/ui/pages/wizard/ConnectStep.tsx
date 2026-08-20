import { useWizardStore } from '@ui/stores/wizard-store'
import { migrationApi } from '@ui/lib/api'

export function ConnectStep() {
  const plugins = useWizardStore((s) => s.plugins)
  const selectedPluginId = useWizardStore((s) => s.selectedPluginId)
  const connectionSource = useWizardStore((s) => s.connectionSource)
  const setConnectionSource = useWizardStore((s) => s.setConnectionSource)
  const clippConnection = useWizardStore((s) => s.clippConnection)
  const setClippConnection = useWizardStore((s) => s.setClippConnection)
  const uniplusConnection = useWizardStore((s) => s.uniplusConnection)
  const setUniplusConnection = useWizardStore((s) => s.setUniplusConnection)
  const buildConnection = useWizardStore((s) => s.buildConnection)
  const setStep = useWizardStore((s) => s.setStep)
  const setBusy = useWizardStore((s) => s.setBusy)
  const setError = useWizardStore((s) => s.setError)
  const setPreview = useWizardStore((s) => s.setPreview)
  const clearProgress = useWizardStore((s) => s.clearProgress)
  const busy = useWizardStore((s) => s.busy)
  const error = useWizardStore((s) => s.error)

  const plugin = plugins.find((p) => p.id === selectedPluginId)
  const isClipp = selectedPluginId === 'clipp'
  const isUniplus = selectedPluginId === 'uniplus'

  const canStart = isClipp
    ? Boolean(clippConnection.fdbPath.trim())
    : isUniplus
      ? Boolean(uniplusConnection.database.trim())
      : Boolean(connectionSource.trim())

  async function handlePickFdb() {
    try {
      const path = await migrationApi.openFdbDialog()
      if (path) setClippConnection({ fdbPath: path })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleStart() {
    if (!selectedPluginId) return
    setError(null)
    clearProgress()
    setPreview(null)
    setBusy(true)
    setStep('running')

    try {
      const connection = buildConnection()
      const preview = await migrationApi.startPreview(selectedPluginId, connection)
      setPreview(preview)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStep('connect')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid-2">
      <div>
        <h2>Conexão</h2>
        <p className="lead">
          {isClipp
            ? 'Informe o arquivo .fdb e as credenciais Firebird do Clipp.'
            : isUniplus
              ? 'Informe host, banco e credenciais Postgres do UniPlus.'
              : 'Informe a origem. Para o plugin Demo, use demo://local.'}
        </p>

        {error && <div className="banner error">{error}</div>}

        <div className="field">
          <label htmlFor="plugin">ERP selecionado</label>
          <input id="plugin" value={plugin?.name ?? selectedPluginId ?? ''} readOnly />
        </div>

        {isClipp ? (
          <>
            <div className="field">
              <label htmlFor="fdbPath">Arquivo .fdb</label>
              <div className="actions" style={{ marginTop: 0 }}>
                <input
                  id="fdbPath"
                  style={{ flex: 1 }}
                  value={clippConnection.fdbPath}
                  onChange={(e) => setClippConnection({ fdbPath: e.target.value })}
                  placeholder="C:\Clipp\dados\EMPRESA.FDB"
                />
                <button type="button" className="btn secondary" onClick={handlePickFdb} disabled={busy}>
                  Procurar…
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="user">Usuário</label>
              <input
                id="user"
                value={clippConnection.user}
                onChange={(e) => setClippConnection({ user: e.target.value })}
                autoComplete="username"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={clippConnection.password}
                onChange={(e) => setClippConnection({ password: e.target.value })}
                autoComplete="current-password"
              />
            </div>

            <div className="field">
              <label htmlFor="host">Host Firebird</label>
              <input
                id="host"
                value={clippConnection.host}
                onChange={(e) => setClippConnection({ host: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="port">Porta</label>
              <input
                id="port"
                value={clippConnection.port}
                onChange={(e) => setClippConnection({ port: e.target.value })}
              />
            </div>
          </>
        ) : isUniplus ? (
          <>
            <div className="field">
              <label htmlFor="up-host">Host</label>
              <input
                id="up-host"
                value={uniplusConnection.host}
                onChange={(e) => setUniplusConnection({ host: e.target.value })}
                placeholder="127.0.0.1"
              />
            </div>
            <div className="field">
              <label htmlFor="up-port">Porta</label>
              <input
                id="up-port"
                value={uniplusConnection.port}
                onChange={(e) => setUniplusConnection({ port: e.target.value })}
                placeholder="5432"
              />
            </div>
            <div className="field">
              <label htmlFor="up-db">Banco de dados</label>
              <input
                id="up-db"
                value={uniplusConnection.database}
                onChange={(e) => setUniplusConnection({ database: e.target.value })}
                placeholder="uniplus"
              />
            </div>
            <div className="field">
              <label htmlFor="up-user">Usuário</label>
              <input
                id="up-user"
                value={uniplusConnection.user}
                onChange={(e) => setUniplusConnection({ user: e.target.value })}
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label htmlFor="up-password">Senha</label>
              <input
                id="up-password"
                type="password"
                value={uniplusConnection.password}
                onChange={(e) => setUniplusConnection({ password: e.target.value })}
                autoComplete="current-password"
              />
            </div>
            <div className="field">
              <label htmlFor="up-ssl">
                <input
                  id="up-ssl"
                  type="checkbox"
                  checked={uniplusConnection.ssl}
                  onChange={(e) => setUniplusConnection({ ssl: e.target.checked })}
                />{' '}
                Usar SSL
              </label>
            </div>
          </>
        ) : (
          <div className="field">
            <label htmlFor="source">Origem / conexão</label>
            <input
              id="source"
              value={connectionSource}
              onChange={(e) => setConnectionSource(e.target.value)}
              placeholder="demo://local"
            />
          </div>
        )}

        <div className="actions">
          <button type="button" className="btn secondary" onClick={() => setStep('select')} disabled={busy}>
            Voltar
          </button>
          <button type="button" className="btn" onClick={handleStart} disabled={busy || !canStart}>
            Detectar e processar
          </button>
        </div>
      </div>

      <aside className="info-block">
        <strong>O que acontece a seguir</strong>
        <p>
          {isClipp
            ? 'É necessário Firebird Server acessível (padrão 127.0.0.1:3050). Serão lidos TB_CLIENTE e TB_ESTOQUE e convertidos para o modelo canônico antes da importação.'
            : isUniplus
              ? 'Conecta no Postgres UniPlus, lê hierarquia, entidade, produto, financeiro, notas e OS, remapeia IDs para UUID e prepara importação no Mais Gestão.'
              : 'A aplicação conecta, detecta o ERP, lê os dados, converte para o modelo canônico, valida e gera uma pré-visualização antes de qualquer importação.'}
        </p>
      </aside>
    </div>
  )
}
