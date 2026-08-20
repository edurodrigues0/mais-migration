import type { SourceEntity } from '@domain/canonical/types'
import type { ValidationResult } from '@domain/plugin/types'

function isInactiveStatus(status: unknown): boolean {
  if (status === null || status === undefined) return false
  const normalized = String(status).trim().toUpperCase()
  return normalized === 'I' || normalized === '0' || normalized === 'INATIVO' || normalized === 'N'
}

export function validateClippEntity(entity: SourceEntity): ValidationResult {
  const issues: ValidationResult['issues'] = []

  if (!entity.externalId) {
    issues.push({ field: 'externalId', message: 'ID externo obrigatório', severity: 'error' })
  }

  if (entity.kind === 'cliente') {
    const nome = entity.raw.NOME ?? entity.raw.nome
    if (!nome || !String(nome).trim()) {
      issues.push({ field: 'NOME', message: 'Nome obrigatório', severity: 'error' })
    }
    if (isInactiveStatus(entity.raw.STATUS)) {
      issues.push({ field: 'STATUS', message: 'Cliente inativo', severity: 'warning' })
    }
  } else if (entity.kind === 'produto') {
    const descricao = entity.raw.DESCRICAO ?? entity.raw.descricao
    if (!descricao || !String(descricao).trim()) {
      issues.push({ field: 'DESCRICAO', message: 'Descrição obrigatória', severity: 'error' })
    }
    if (isInactiveStatus(entity.raw.STATUS) || isInactiveStatus(entity.raw.STATUS_PRODUTO)) {
      issues.push({ field: 'STATUS', message: 'Produto inativo', severity: 'warning' })
    }
  } else if (entity.kind === 'taxa_uf') {
    const codigo = entity.raw.ID_CTI ?? entity.externalId
    if (!codigo || !String(codigo).trim()) {
      issues.push({ field: 'ID_CTI', message: 'Código da taxa UF obrigatório', severity: 'error' })
    }
  } else {
    issues.push({ message: `Tipo não suportado pelo Clipp: ${entity.kind}`, severity: 'error' })
  }

  return {
    valid: !issues.some((i) => i.severity === 'error'),
    issues
  }
}
