/**
 * Código TB_TAXA_UF.ID_CTI / taxauf.codigo: CHAR(4) no Clipp, varchar(4) no destino.
 * Trim + maiúsculas evita mismatch de padding e de UUID v5.
 */
export function normalizeTaxaUfCodigo(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const text =
    typeof Buffer !== 'undefined' && Buffer.isBuffer(value)
      ? value.toString('utf8')
      : String(value)
  const normalized = text.trim().toUpperCase().slice(0, 4)
  return normalized || null
}

/** Resolve idtaxauf: código da empresa, senão UUID determinístico se existir no destino. */
export function pickTaxaUfId(
  codigo: string | null | undefined,
  byCodigo: Map<string, string>,
  knownIds?: Set<string>,
  fallbackId?: string | null
): string | null {
  const key = normalizeTaxaUfCodigo(codigo)
  if (!key) return null
  const byCode = byCodigo.get(key)
  if (byCode) return byCode
  if (fallbackId && knownIds?.has(fallbackId)) return fallbackId
  return null
}

export function indexTaxaUfRows(
  rows: Array<{ id: string; codigo: string | null | undefined }>
): { byCodigo: Map<string, string>; ids: Set<string> } {
  const byCodigo = new Map<string, string>()
  const ids = new Set<string>()
  for (const row of rows) {
    ids.add(row.id)
    const key = normalizeTaxaUfCodigo(row.codigo)
    if (key && !byCodigo.has(key)) byCodigo.set(key, row.id)
  }
  return { byCodigo, ids }
}

/** Normaliza código fiscal (CFOP, CEST) para só dígitos. */
export function taxCodeDigits(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const digits = String(value).replace(/\D/g, '')
  return digits || null
}

/** CEST oficial tem 7 dígitos; 301000 no Clipp casa com 0301000 no destino. */
export function padCestDigits(digits: string | null): string | null {
  if (!digits) return null
  return digits.length >= 7 ? digits : digits.padStart(7, '0')
}

export function uniqueTaxCodes(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>()
  for (const value of values) {
    const digits = taxCodeDigits(value)
    if (digits) set.add(digits)
  }
  return [...set]
}

/**
 * Entre vários cest com o mesmo código, prefere o da empresa; senão o global.
 */
export function pickPreferredCestId(
  rows: Array<{ id: string; digits: string; idempresa: string | null }>,
  idempresa: string
): Map<string, string> {
  const byDigits = new Map<string, { id: string; idempresa: string | null }>()
  for (const row of rows) {
    const current = byDigits.get(row.digits)
    const isCompany = row.idempresa === idempresa
    if (!current) {
      byDigits.set(row.digits, row)
      continue
    }
    if (isCompany && current.idempresa !== idempresa) {
      byDigits.set(row.digits, row)
    }
  }
  return new Map([...byDigits.entries()].map(([digits, row]) => [digits, row.id]))
}
