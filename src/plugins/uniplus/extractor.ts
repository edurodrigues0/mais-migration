import type { EntityKind, SourceEntity } from '@domain/canonical/types'
import type { UniplusConnector } from './connector'
import { EXTRACT_PAGE_SIZE, sourceSelectColumns } from './extract-columns'
import { rowToRaw } from './types'

interface ExtractSpec {
  table: string
  kind: EntityKind
  idColumn?: string
}

const EXTRACT_ORDER: ExtractSpec[] = [
  { table: 'planocontas', kind: 'plano_contas' },
  { table: 'hierarquia', kind: 'hierarquia' },
  { table: 'entidade', kind: 'entidade' },
  { table: 'produto', kind: 'produto' },
  { table: 'notafiscal', kind: 'nota_fiscal' },
  { table: 'notafiscalitem', kind: 'nota_fiscal_item' },
  { table: 'financeiro', kind: 'financeiro' },
  { table: 'financeirolancamento', kind: 'financeiro_lancamento' },
  { table: 'ordemservico', kind: 'ordem_servico' },
  { table: 'ordemservicoevento', kind: 'ordem_servico_evento' },
  { table: 'ordemservicofaturamento', kind: 'ordem_servico_faturamento' },
  { table: 'ordemservicoitem', kind: 'ordem_servico_item' },
  { table: 'ordemservicoitemlote', kind: 'ordem_servico_item_lote' }
]

const HEAVY_KEY =
  /^(arquivoxml|imagem|foto|caminhoimagem|caminhoicone|jsonretornodocumento|hash|hashpaf)/i

function stripHeavyColumns(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (HEAVY_KEY.test(key)) continue
    if (typeof value === 'string' && value.length > 50_000) continue
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) continue
    out[key] = value
  }
  return out
}

async function* queryPaged(
  connector: UniplusConnector,
  table: string,
  columns: string[]
): AsyncGenerator<Record<string, unknown>> {
  const selectList = columns.map((c) => `"${c}"`).join(', ')
  let useStar = false
  let offset = 0

  for (;;) {
    const sql = useStar
      ? `SELECT * FROM ${table} ORDER BY id LIMIT $1 OFFSET $2`
      : `SELECT ${selectList} FROM ${table} ORDER BY id LIMIT $1 OFFSET $2`

    let rows: Record<string, unknown>[]
    try {
      rows = await connector.query(sql, [EXTRACT_PAGE_SIZE, offset])
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!useStar && /column .* does not exist/i.test(message)) {
        useStar = true
        continue
      }
      throw new Error(`Falha ao ler tabela UniPlus ${table}: ${message}`)
    }

    if (rows.length === 0) return
    for (const row of rows) {
      yield useStar ? stripHeavyColumns(row) : row
    }
    if (rows.length < EXTRACT_PAGE_SIZE) return
    offset += rows.length
  }
}

export async function* extractUniplusEntities(
  connector: UniplusConnector
): AsyncGenerator<SourceEntity> {
  for (const spec of EXTRACT_ORDER) {
    const idColumn = spec.idColumn ?? 'id'
    const columns = sourceSelectColumns(spec.kind)

    for await (const row of queryPaged(connector, spec.table, columns)) {
      const raw = rowToRaw(row)
      const externalId = String(raw[idColumn] ?? '')
      if (!externalId) continue
      yield {
        externalId,
        kind: spec.kind,
        raw
      }
    }
  }
}

export async function countUniplusExtractable(connector: UniplusConnector): Promise<number> {
  let total = 0
  for (const spec of EXTRACT_ORDER) {
    try {
      const rows = await connector.query<{ count: string | number }>(
        `SELECT COUNT(*)::int AS count FROM ${spec.table}`
      )
      total += Number(rows[0]?.count ?? 0)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (/does not exist|relation .* does not exist/i.test(message)) continue
      throw new Error(`Falha ao contar tabela UniPlus ${spec.table}: ${message}`)
    }
  }
  return total
}
