import type { CanonicalEntity, SourceEntity } from '@domain/canonical/types'
import {
  ClienteSchema,
  EmpresaSchema,
  FornecedorSchema,
  ProdutoSchema
} from '@domain/canonical/types'

const SOURCE = 'demo'

function digitsOnly(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const digits = value.replace(/\D/g, '')
  return digits || undefined
}

export function mapDemoEntity(entity: SourceEntity): CanonicalEntity {
  switch (entity.kind) {
    case 'empresa': {
      const payload = EmpresaSchema.parse({
        razaoSocial: String(entity.raw.razao ?? '').trim(),
        nomeFantasia: entity.raw.fantasia ? String(entity.raw.fantasia).trim() : undefined,
        cnpj: digitsOnly(entity.raw.cnpj),
        email: entity.raw.email ? String(entity.raw.email).trim() : undefined
      })
      return { externalId: entity.externalId, sourceSystem: SOURCE, kind: 'empresa', payload, warnings: [] }
    }
    case 'cliente': {
      const warnings: string[] = []
      let email = entity.raw.email ? String(entity.raw.email).trim() : undefined
      if (email && !email.includes('@')) {
        warnings.push('E-mail inválido removido')
        email = undefined
      }
      const payload = ClienteSchema.parse({
        nome: String(entity.raw.nome ?? '').trim(),
        documento: digitsOnly(entity.raw.cpf ?? entity.raw.documento),
        email: email ?? '',
        cidade: entity.raw.cidade ? String(entity.raw.cidade) : undefined,
        uf: entity.raw.uf ? String(entity.raw.uf) : undefined
      })
      return { externalId: entity.externalId, sourceSystem: SOURCE, kind: 'cliente', payload, warnings }
    }
    case 'produto': {
      const payload = ProdutoSchema.parse({
        codigo: String(entity.raw.sku ?? entity.raw.codigo ?? ''),
        descricao: String(entity.raw.nome ?? entity.raw.descricao ?? ''),
        unidade: String(entity.raw.und ?? 'UN'),
        preco: Number(entity.raw.valor ?? entity.raw.preco ?? 0),
        ncm: entity.raw.ncm ? String(entity.raw.ncm) : undefined
      })
      return { externalId: entity.externalId, sourceSystem: SOURCE, kind: 'produto', payload, warnings: [] }
    }
    case 'fornecedor': {
      const payload = FornecedorSchema.parse({
        nome: String(entity.raw.nome ?? '').trim(),
        documento: digitsOnly(entity.raw.cnpj ?? entity.raw.documento),
        email: entity.raw.email ? String(entity.raw.email).trim() : '',
        telefone: entity.raw.telefone ? String(entity.raw.telefone) : undefined
      })
      return { externalId: entity.externalId, sourceSystem: SOURCE, kind: 'fornecedor', payload, warnings: [] }
    }
    default:
      throw new Error(`Entidade não suportada pelo plugin demo: ${entity.kind}`)
  }
}
