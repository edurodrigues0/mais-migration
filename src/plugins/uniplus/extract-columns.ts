import type { EntityKind } from '@domain/canonical/types'
import { KIND_TO_TABLE, UNIPLUS_TABLE_COLUMNS } from '@infrastructure/importer/uniplus-import-columns'

/** Colunas só do destino (não existem / não ler na origem) */
const SKIP_SOURCE = new Set([
  'idempresa',
  'criadoem',
  'atualizadoem',
  'datacadastro',
  'datacriacao',
  'dataalteracao'
])

/** Colunas de origem necessárias para remap/rename (além das do destino) */
const EXTRA_SOURCE: Partial<Record<EntityKind, string[]>> = {
  entidade: ['transportadora'],
  produto: ['idhierarquia', 'idfornecedor', 'idfabricante', 'idcomprador', 'customedio']
}

/**
 * Lista de colunas para SELECT na origem UniPlus.
 * Evita SELECT * e blobs (XML/imagem).
 */
export function sourceSelectColumns(kind: EntityKind): string[] {
  const table = KIND_TO_TABLE[kind]
  if (!table) return ['id']
  const dest = UNIPLUS_TABLE_COLUMNS[table] ?? ['id']
  const cols = new Set<string>()
  for (const c of dest) {
    if (SKIP_SOURCE.has(c)) continue
    // destino idgrupo vem de idhierarquia na origem
    if (c === 'idgrupo') {
      cols.add('idhierarquia')
      continue
    }
    if (c === 'transportador') {
      cols.add('transportadora')
      continue
    }
    if (c === 'infocompgerada') {
      cols.add('informacoescomplementaresgeradas')
      cols.add('infocompgerada')
      continue
    }
    if (c === 'codigorproduto') {
      cols.add('codigoproduto')
      cols.add('codigorproduto')
      continue
    }
    cols.add(c)
  }
  for (const extra of EXTRA_SOURCE[kind] ?? []) {
    cols.add(extra)
  }
  cols.add('id')
  return [...cols]
}

/** Página maior = menos round-trips Postgres; memória limitada pelo slim payload. */
export const EXTRACT_PAGE_SIZE = 1000
