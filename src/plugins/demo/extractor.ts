import type { SourceEntity } from '@domain/canonical/types'

const FIXTURES: SourceEntity[] = [
  {
    externalId: 'emp-1',
    kind: 'empresa',
    raw: {
      razao: ' Demo Comércio LTDA ',
      fantasia: 'Demo Store',
      cnpj: '12.345.678/0001-90',
      email: 'contato@demo.local'
    }
  },
  {
    externalId: 'cli-1',
    kind: 'cliente',
    raw: {
      nome: ' Ana Silva ',
      cpf: '123.456.789-09',
      email: 'ana@email.com',
      cidade: 'São Paulo',
      uf: 'SP'
    }
  },
  {
    externalId: 'cli-2',
    kind: 'cliente',
    raw: {
      nome: 'Bruno Costa',
      cpf: '98765432100',
      email: 'bruno-invalido',
      cidade: 'Curitiba',
      uf: 'PR'
    }
  },
  {
    externalId: 'prod-1',
    kind: 'produto',
    raw: {
      sku: 'SKU-001',
      nome: 'Teclado Mecânico',
      und: 'UN',
      valor: 350.5,
      ncm: '84716053'
    }
  },
  {
    externalId: 'prod-2',
    kind: 'produto',
    raw: {
      sku: 'SKU-002',
      nome: 'Mouse Óptico',
      und: 'UN',
      valor: 89.9
    }
  },
  {
    externalId: 'forn-1',
    kind: 'fornecedor',
    raw: {
      nome: 'Fornecedor Alpha',
      cnpj: '11.222.333/0001-81',
      email: 'alpha@forn.local',
      telefone: '11999990000'
    }
  }
]

export async function* extractDemoEntities(): AsyncGenerator<SourceEntity> {
  for (const entity of FIXTURES) {
    yield entity
  }
}

export function countDemoExtractable(): number {
  return FIXTURES.length
}
