/** Normaliza código do plano (espaços múltiplos → um). */
export function normalizePlanoContasCodigo(codigo: unknown): string {
  return String(codigo ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Código do pai a partir do código hierárquico.
 * "1 2 1" → "1 2"; "1.2.1" → "1.2"; raiz → null.
 */
export function parentAccountCodigo(codigo: unknown): string | null {
  const normalized = normalizePlanoContasCodigo(codigo)
  if (!normalized) return null

  if (normalized.includes(' ')) {
    const parts = normalized.split(' ').filter(Boolean)
    if (parts.length < 2) return null
    return parts.slice(0, -1).join(' ')
  }

  if (normalized.includes('.')) {
    const parts = normalized.split('.').filter(Boolean)
    if (parts.length < 2) return null
    return parts.slice(0, -1).join('.')
  }

  return null
}

export function planoContasCodigoDepth(codigo: unknown): number {
  const normalized = normalizePlanoContasCodigo(codigo)
  if (!normalized) return 0
  if (normalized.includes(' ')) return normalized.split(' ').filter(Boolean).length
  if (normalized.includes('.')) return normalized.split('.').filter(Boolean).length
  return 1
}

export interface PlanoContasHierarchyRow {
  id: string
  codigo: string | null
  idplanocontas: string | null
}

/**
 * Filhos sem pai válido herdam o id da conta cujo código é o prefixo.
 * Não sobrescreve idplanocontas já apontando para uma conta da mesma empresa.
 */
export function resolvePlanoContasParentUpdates(
  rows: PlanoContasHierarchyRow[]
): Array<{ id: string; idplanocontas: string }> {
  const ids = new Set(rows.map((row) => row.id))
  const byCodigo = new Map<string, string>()
  for (const row of rows) {
    const key = normalizePlanoContasCodigo(row.codigo)
    if (key && !byCodigo.has(key)) byCodigo.set(key, row.id)
  }

  const updates: Array<{ id: string; idplanocontas: string }> = []
  for (const row of rows) {
    const current =
      row.idplanocontas && ids.has(row.idplanocontas) && row.idplanocontas !== row.id
        ? row.idplanocontas
        : null
    if (current) continue

    const parentCodigo = parentAccountCodigo(row.codigo)
    if (!parentCodigo) continue
    const parentId = byCodigo.get(parentCodigo)
    if (!parentId || parentId === row.id) continue
    updates.push({ id: row.id, idplanocontas: parentId })
  }
  return updates
}
