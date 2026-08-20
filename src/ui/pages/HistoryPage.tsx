import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { migrationApi } from '@ui/lib/api'

export function HistoryPage() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const historyQuery = useQuery({
    queryKey: ['history'],
    queryFn: () => migrationApi.listHistory()
  })

  const rollbackMutation = useMutation({
    mutationFn: (jobId: string) => migrationApi.rollbackJob(jobId),
    onSuccess: (job) => {
      setError(null)
      setMessage(`Rollback concluído para o job ${job.id}.`)
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
    onError: (err) => {
      setMessage(null)
      setError(err instanceof Error ? err.message : String(err))
    }
  })

  function handleRollback(jobId: string) {
    const confirmed = window.confirm(
      'Deseja reverter esta migração? Os clientes e produtos importados serão removidos do destino.'
    )
    if (!confirmed) return
    setError(null)
    setMessage(null)
    rollbackMutation.mutate(jobId)
  }

  return (
    <section className="panel">
      <h1>Histórico</h1>
      <p className="lead">Jobs de migração executados neste computador. Jobs concluídos podem ser revertidos.</p>

      {historyQuery.isLoading && <p className="empty">Carregando…</p>}
      {historyQuery.error && (
        <div className="banner error">
          {historyQuery.error instanceof Error
            ? historyQuery.error.message
            : String(historyQuery.error)}
        </div>
      )}
      {error && <div className="banner error">{error}</div>}
      {message && <div className="banner ok">{message}</div>}

      <div className="history-list">
        {(historyQuery.data ?? []).map((job) => (
          <div className="history-item" key={job.id}>
            <div>
              <strong>{job.pluginId}</strong>
              <div>{job.id}</div>
              <div>{new Date(job.createdAt).toLocaleString('pt-BR')}</div>
            </div>
            <div className="history-actions">
              <span className={`badge ${job.status}`}>{job.status}</span>
              {job.status === 'completed' && (
                <button
                  type="button"
                  className="btn danger"
                  disabled={rollbackMutation.isPending}
                  onClick={() => handleRollback(job.id)}
                >
                  Rollback
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!historyQuery.isLoading && (historyQuery.data?.length ?? 0) === 0 && (
        <p className="empty">Nenhuma migração registrada ainda.</p>
      )}
    </section>
  )
}
