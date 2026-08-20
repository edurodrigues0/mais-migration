import { v5 as uuidv5 } from 'uuid'

/** Namespace fixo para IDs determinísticos (UUID v5) na migração → Mais Gestão */
export const MAIS_MIGRATION_NAMESPACE = '7c9e6679-7425-40de-944b-e07fc1f90ae7'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function destinationId(
  kind: string,
  externalId: string,
  sourceSystem = 'clipp'
): string {
  return uuidv5(`${sourceSystem}:${kind}:${externalId}`, MAIS_MIGRATION_NAMESPACE)
}

export function destinationClienteId(externalId: string, sourceSystem = 'clipp'): string {
  return destinationId('cliente', externalId, sourceSystem)
}

export function destinationProdutoId(externalId: string, sourceSystem = 'clipp'): string {
  return destinationId('produto', externalId, sourceSystem)
}

export function destinationTaxaUfId(externalId: string, sourceSystem = 'clipp'): string {
  return destinationId('taxa_uf', externalId, sourceSystem)
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}
