import type { CanonicalEntity } from '@domain/canonical/types'



function digitsOnly(value: string): string {

  return value.replace(/\D/g, '')

}



function isColumnsPayload(payload: Record<string, unknown>): boolean {

  return payload.columns !== undefined && typeof payload.columns === 'object'

}



/**

 * Correções automáticas simples e seguras (trim, documentos, defaults).

 * Payloads UniPlus `{ columns }` passam leves — evita alocações por registro.

 */

export function autoFixCanonical(entity: CanonicalEntity): CanonicalEntity {

  const payload = entity.payload as Record<string, unknown>



  // Formato colunas (UniPlus): sem trim profundo; só defaults de produto se necessário

  if (isColumnsPayload(payload)) {

    if (entity.kind !== 'produto') return entity

    const cols = payload.columns as Record<string, unknown>

    if (cols.unidade != null && cols.unidade !== '' && cols.preco != null) {

      return entity

    }

    const nextCols = { ...cols }

    const warnings = entity.warnings.length ? [...entity.warnings] : []

    if (!nextCols.unidade) {

      nextCols.unidade = 'UN'

      warnings.push('Unidade padrão UN aplicada')

    }

    if (nextCols.preco === undefined || nextCols.preco === null) {

      nextCols.preco = 0

      warnings.push('Preço padrão 0 aplicado')

    }

    if (warnings.length === entity.warnings.length) return entity

    return { ...entity, payload: { columns: nextCols }, warnings }

  }



  const warnings = [...entity.warnings]

  const next = { ...payload }



  for (const [key, value] of Object.entries(next)) {

    if (typeof value === 'string') {

      const trimmed = value.trim()

      if (trimmed !== value) {

        next[key] = trimmed

        warnings.push(`Campo ${key} normalizado (trim)`)

      }

    }

  }



  if (typeof next.documento === 'string') {

    next.documento = digitsOnly(next.documento)

  }

  if (typeof next.cnpj === 'string') {

    next.cnpj = digitsOnly(next.cnpj)

  }

  if (entity.kind === 'produto' && !next.unidade) {

    next.unidade = 'UN'

    warnings.push('Unidade padrão UN aplicada')

  }

  if (entity.kind === 'produto' && (next.preco === undefined || next.preco === null)) {

    next.preco = 0

    warnings.push('Preço padrão 0 aplicado')

  }



  return {

    ...entity,

    payload: next,

    warnings: warnings.length === entity.warnings.length ? entity.warnings : [...new Set(warnings)]

  }

}

