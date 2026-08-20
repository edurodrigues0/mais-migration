import type { SourceEntity } from '@domain/canonical/types'
import type { ValidationResult } from '@domain/plugin/types'

export function validateUniplusEntity(entity: SourceEntity): ValidationResult {
  const issues: ValidationResult['issues'] = []

  if (!entity.externalId) {
    issues.push({ field: 'externalId', message: 'ID externo obrigatório', severity: 'error' })
  }

  switch (entity.kind) {
    case 'entidade': {
      const nome = entity.raw.nome
      if (!nome || !String(nome).trim()) {
        issues.push({ field: 'nome', message: 'Nome obrigatório', severity: 'error' })
      }
      break
    }
    case 'produto': {
      const nome = entity.raw.nome ?? entity.raw.descricao
      if (!nome || !String(nome).trim()) {
        issues.push({ field: 'nome', message: 'Nome/descrição obrigatório', severity: 'error' })
      }
      break
    }
    case 'hierarquia': {
      const nome = entity.raw.nome
      if (!nome || !String(nome).trim()) {
        issues.push({ field: 'nome', message: 'Nome obrigatório', severity: 'warning' })
      }
      break
    }
    case 'plano_contas': {
      const nome = entity.raw.nome
      if (!nome || !String(nome).trim()) {
        issues.push({ field: 'nome', message: 'Nome ausente', severity: 'warning' })
      }
      break
    }
    case 'nota_fiscal_item': {
      if (!entity.raw.idnotafiscal) {
        issues.push({
          field: 'idnotafiscal',
          message: 'Item sem nota fiscal',
          severity: 'error'
        })
      }
      break
    }
    case 'financeiro_lancamento': {
      if (!entity.raw.idfinanceiro) {
        issues.push({
          field: 'idfinanceiro',
          message: 'Lançamento sem financeiro',
          severity: 'error'
        })
      }
      break
    }
    case 'ordem_servico_item': {
      if (!entity.raw.idordemservico) {
        issues.push({
          field: 'idordemservico',
          message: 'Item sem OS',
          severity: 'error'
        })
      }
      break
    }
    case 'ordem_servico_item_lote': {
      if (!entity.raw.idordemservicoitem) {
        issues.push({
          field: 'idordemservicoitem',
          message: 'Lote sem item de OS',
          severity: 'error'
        })
      }
      break
    }
    default:
      break
  }

  return {
    valid: !issues.some((i) => i.severity === 'error'),
    issues
  }
}
