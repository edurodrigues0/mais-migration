import type { SourceEntity } from '@domain/canonical/types'
import type { ValidationResult } from '@domain/plugin/types'

export function validateDemoEntity(entity: SourceEntity): ValidationResult {
  const issues: ValidationResult['issues'] = []

  if (!entity.externalId) {
    issues.push({ field: 'externalId', message: 'ID externo obrigatório', severity: 'error' })
  }

  switch (entity.kind) {
    case 'empresa':
      if (!entity.raw.razao) {
        issues.push({ field: 'razao', message: 'Razão social obrigatória', severity: 'error' })
      }
      break
    case 'cliente':
      if (!entity.raw.nome) {
        issues.push({ field: 'nome', message: 'Nome obrigatório', severity: 'error' })
      }
      if (entity.raw.email && !String(entity.raw.email).includes('@')) {
        issues.push({ field: 'email', message: 'E-mail inválido', severity: 'warning' })
      }
      break
    case 'produto':
      if (!entity.raw.sku && !entity.raw.codigo) {
        issues.push({ field: 'sku', message: 'Código obrigatório', severity: 'error' })
      }
      if (!entity.raw.nome && !entity.raw.descricao) {
        issues.push({ field: 'nome', message: 'Descrição obrigatória', severity: 'error' })
      }
      break
    case 'fornecedor':
      if (!entity.raw.nome) {
        issues.push({ field: 'nome', message: 'Nome obrigatório', severity: 'error' })
      }
      break
    default:
      issues.push({ message: `Tipo não suportado: ${entity.kind}`, severity: 'error' })
  }

  return {
    valid: !issues.some((i) => i.severity === 'error'),
    issues
  }
}
