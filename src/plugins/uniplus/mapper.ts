import type { CanonicalEntity, SourceEntity } from '@domain/canonical/types'
import { UNIPLUS_SOURCE } from './types'
import { mapUniplusRow } from './row-mapper'

export function mapUniplusEntity(entity: SourceEntity): CanonicalEntity {
  const { row, warnings } = mapUniplusRow(entity.kind, entity.raw)

  return {
    externalId: entity.externalId,
    sourceSystem: UNIPLUS_SOURCE,
    kind: entity.kind,
    payload: { columns: row },
    warnings
  }
}
