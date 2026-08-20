import { describe, expect, it } from 'vitest'
import { destinationId, isUuid } from '@infrastructure/importer/mais-gestao-ids'
import { mapUniplusEntity } from '@plugins/uniplus/mapper'
import { validateUniplusEntity } from '@plugins/uniplus/validator'
import type { SourceEntity } from '@domain/canonical/types'
import {
  pickColumns,
  buildUpsertSql,
  coerceIntegerColumns,
  coerceVarcharColumns,
  toIntegerOrNull,
  truncateVarchar,
  truncateOverflowingValue,
  normalizeChaveNfe,
  collectFkIds,
  nullMissingFks,
  sortImportKinds,
  coerceFkId,
  resolveScopedFk,
  REQUIRED_PARENT_FKS
} from '@infrastructure/importer/uniplus-import-columns'

describe('uniplus plugin', () => {
  it('generates stable UUID v5 for the same source id', () => {
    const a = destinationId('entidade', '10', 'uniplus')
    const b = destinationId('entidade', '10', 'uniplus')
    expect(a).toBe(b)
    expect(isUuid(a)).toBe(true)
    expect(destinationId('produto', '10', 'uniplus')).not.toBe(a)
  })

  it('maps entidade with flags and remaps id', () => {
    const source: SourceEntity = {
      externalId: '10',
      kind: 'entidade',
      raw: {
        id: 10,
        nome: 'Cliente Uni',
        cnpjcpf: '123.456.789-09',
        cliente: 1,
        fornecedor: 0,
        transportadora: 1,
        representante: 0,
        idcidade: 5,
        email: 'a@b.com'
      }
    }

    expect(validateUniplusEntity(source).valid).toBe(true)
    const canonical = mapUniplusEntity(source)
    const columns = (canonical.payload as { columns: Record<string, unknown> }).columns
    expect(columns.id).toBe(destinationId('entidade', '10', 'uniplus'))
    expect(columns.transportador).toBe(1)
    expect(columns.cnpjcpf).toBe('12345678909')
    expect(columns.idcidade).toBeUndefined()
    expect(canonical.warnings.some((w) => /FKs auxiliares/i.test(w))).toBe(true)
  })

  it('maps produto idhierarquia to idgrupo UUID', () => {
    const source: SourceEntity = {
      externalId: '55',
      kind: 'produto',
      raw: {
        id: 55,
        nome: 'Produto X',
        codigo: 55,
        preco: 9.9,
        idhierarquia: 3,
        idfornecedor: 10,
        idcfopsaida: 99
      }
    }

    const canonical = mapUniplusEntity(source)
    const columns = (canonical.payload as { columns: Record<string, unknown> }).columns
    expect(columns.idgrupo).toBe(destinationId('hierarquia', '3', 'uniplus'))
    expect(columns.fornecedor).toBe(destinationId('entidade', '10', 'uniplus'))
    expect(columns.idcfopsaida).toBeUndefined()
    expect(columns.descricao).toBeTruthy()
  })

  it('maps plano de contas and remaps parent and associated FKs', () => {
    const conta: SourceEntity = {
      externalId: '1',
      kind: 'plano_contas',
      raw: { id: 1, codigo: '1.1.01', nome: 'Receita', idplanocontas: 9, inativo: 0 }
    }
    expect(validateUniplusEntity(conta).valid).toBe(true)
    const contaCols = (mapUniplusEntity(conta).payload as { columns: Record<string, unknown> })
      .columns
    expect(contaCols.id).toBe(destinationId('plano_contas', '1', 'uniplus'))
    expect(contaCols.idplanocontas).toBe(destinationId('plano_contas', '9', 'uniplus'))
    expect(contaCols.nome).toBe('Receita')

    const entidade: SourceEntity = {
      externalId: '10',
      kind: 'entidade',
      raw: { id: 10, nome: 'Cliente', cnpjcpf: '12345678909', idplanocontas: 1 }
    }
    const produto: SourceEntity = {
      externalId: '55',
      kind: 'produto',
      raw: { id: 55, nome: 'Produto', codigo: 55, idplanocontas: 1 }
    }
    const nf: SourceEntity = {
      externalId: '100',
      kind: 'nota_fiscal',
      raw: { id: 100, numeronotafiscal: '1', idplanocontas: 1 }
    }
    const fin: SourceEntity = {
      externalId: '20',
      kind: 'financeiro',
      raw: { id: 20, documento: 'DUP-1', idplanocontas: 1 }
    }

    const expected = destinationId('plano_contas', '1', 'uniplus')
    expect(
      (mapUniplusEntity(entidade).payload as { columns: Record<string, unknown> }).columns
        .idplanocontas
    ).toBe(expected)
    expect(
      (mapUniplusEntity(produto).payload as { columns: Record<string, unknown> }).columns
        .idplanocontas
    ).toBe(expected)
    expect(
      (mapUniplusEntity(nf).payload as { columns: Record<string, unknown> }).columns.idplanocontas
    ).toBe(expected)
    expect(
      (mapUniplusEntity(fin).payload as { columns: Record<string, unknown> }).columns.idplanocontas
    ).toBe(expected)
  })

  it('still nulls auxiliary planocontas FKs on financeiro lancamento', () => {
    const lanc: SourceEntity = {
      externalId: '3',
      kind: 'financeiro_lancamento',
      raw: {
        id: 3,
        idfinanceiro: 20,
        valor: 10,
        idplanocontasjuros: 1,
        idplanocontasmulta: 2
      }
    }
    const cols = (mapUniplusEntity(lanc).payload as { columns: Record<string, unknown> }).columns
    expect(cols.idfinanceiro).toBe(destinationId('financeiro', '20', 'uniplus'))
    expect(cols.idplanocontasjuros).toBeUndefined()
    expect(cols.idplanocontasmulta).toBeUndefined()
  })

  it('maps financeiro lancamento and nota item FKs', () => {
    const fin: SourceEntity = {
      externalId: '1',
      kind: 'financeiro_lancamento',
      raw: { id: 1, idfinanceiro: 20, valor: 100, evento: 1 }
    }
    const item: SourceEntity = {
      externalId: '2',
      kind: 'nota_fiscal_item',
      raw: {
        id: 2,
        idnotafiscal: 7,
        idproduto: 55,
        descricao: 'Item',
        quantidade: 1,
        precounitario: 10,
        total: 10
      }
    }

    const finCols = (mapUniplusEntity(fin).payload as { columns: Record<string, unknown> }).columns
    expect(finCols.idfinanceiro).toBe(destinationId('financeiro', '20', 'uniplus'))

    const itemCols = (mapUniplusEntity(item).payload as { columns: Record<string, unknown> }).columns
    expect(itemCols.idnotafiscal).toBe(destinationId('nota_fiscal', '7', 'uniplus'))
    expect(itemCols.idproduto).toBe(destinationId('produto', '55', 'uniplus'))
  })

  it('maps OS item and sets synthetic tipo evento', () => {
    const osItem: SourceEntity = {
      externalId: '3',
      kind: 'ordem_servico_item',
      raw: {
        id: 3,
        idordemservico: 8,
        idproduto: 55,
        quantidade: 1,
        preco: 50,
        total: 50,
        codigoproduto: 'SKU-9'
      }
    }
    const evento: SourceEntity = {
      externalId: '4',
      kind: 'ordem_servico_evento',
      raw: { id: 4, idordemservico: 8, descricao: 'Aberto', tipo: 1 }
    }

    const itemCols = (mapUniplusEntity(osItem).payload as { columns: Record<string, unknown> })
      .columns
    expect(itemCols.idordemservico).toBe(destinationId('ordem_servico', '8', 'uniplus'))
    expect(itemCols.codigorproduto).toBe('SKU-9')
    expect(itemCols.codigoproduto).toBeUndefined()

    const evCols = (mapUniplusEntity(evento).payload as { columns: Record<string, unknown> }).columns
    expect(evCols.idtipoevento).toBe(destinationId('tipo_os_evento', 'default', 'uniplus'))
  })

  it('renames notafiscal info complementar and drops percentualipi from item', () => {
    const nf: SourceEntity = {
      externalId: '100',
      kind: 'nota_fiscal',
      raw: {
        id: 100,
        numeronotafiscal: '1',
        serie: '1',
        informacoescomplementaresgeradas: 'Info gerada',
        observacao: 'Obs'
      }
    }
    const item: SourceEntity = {
      externalId: '101',
      kind: 'nota_fiscal_item',
      raw: {
        id: 101,
        idnotafiscal: 100,
        idproduto: 55,
        descricao: 'Item',
        quantidade: 1,
        precounitario: 10,
        total: 10,
        ipi: 1.5,
        percentualipi: 5
      }
    }

    const nfCols = (mapUniplusEntity(nf).payload as { columns: Record<string, unknown> }).columns
    expect(nfCols.infocompgerada).toBe('Info gerada')
    expect(nfCols.informacoescomplementaresgeradas).toBeUndefined()

    const itemCols = (mapUniplusEntity(item).payload as { columns: Record<string, unknown> }).columns
    expect(itemCols.ipi).toBe(1.5)
    expect(itemCols.percentualipi).toBeUndefined()
  })

  it('builds upsert SQL and picks columns with idempresa', () => {
    const sql = buildUpsertSql('entidade', ['id', 'idempresa', 'nome'])
    expect(sql).toContain('ON CONFLICT (id)')
    expect(sql).toContain('nome = EXCLUDED.nome')

    const picked = pickColumns(
      { id: 'uuid-1', nome: 'Teste', cnpjcpf: '1' },
      ['id', 'idempresa', 'nome', 'cnpjcpf', 'criadoem', 'atualizadoem'],
      'emp-1'
    )
    expect(picked.columns).toContain('idempresa')
    expect(picked.values[picked.columns.indexOf('idempresa')]).toBe('emp-1')
  })

  it('builds slim source select without xml columns', async () => {
    const { sourceSelectColumns } = await import('@plugins/uniplus/extract-columns')
    const cols = sourceSelectColumns('nota_fiscal')
    expect(cols).toContain('id')
    expect(cols).toContain('numeronotafiscal')
    expect(cols).toContain('informacoescomplementaresgeradas')
    expect(cols).toContain('idplanocontas')
    expect(cols).not.toContain('idempresa')
    expect(cols.some((c) => /arquivoxml/i.test(c))).toBe(false)

    const osItemCols = sourceSelectColumns('ordem_servico_item')
    expect(osItemCols).toContain('codigoproduto')

    const planoCols = sourceSelectColumns('plano_contas')
    expect(planoCols).toContain('id')
    expect(planoCols).toContain('codigo')
    expect(planoCols).toContain('nome')
    expect(planoCols).toContain('idplanocontas')
    expect(planoCols).not.toContain('idcontacontabilintegracao')
    expect(planoCols).not.toContain('idempresa')
  })

  it('coerces decimal strings to integers for Postgres', () => {
    expect(toIntegerOrNull('0.000000')).toBe(0)
    expect(toIntegerOrNull('12.9')).toBe(12)
    expect(toIntegerOrNull('')).toBeNull()
    expect(toIntegerOrNull(null)).toBeNull()

    const coerced = coerceIntegerColumns(
      {
        codigo: '55.0',
        quantidademinima: '0.000000',
        quantidademaxima: '10.500000',
        preco: '9.90',
        origem: '0.000000'
      },
      'produtos'
    )
    expect(coerced.codigo).toBe(55)
    expect(coerced.quantidademinima).toBe(0)
    expect(coerced.quantidademaxima).toBe(10)
    expect(coerced.origem).toBe(0)
    expect(coerced.preco).toBe('9.90')
  })

  it('nulls missing entidade FKs for soft import', () => {
    const ok = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    const missing = '11111111-2222-4333-8444-555555555555'
    const rows = [
      { id: 'nf-1', idrepresentante: ok, identidade: missing },
      { id: 'nf-2', idrepresentante: missing, idtransportadora: null }
    ]
    const fields = ['identidade', 'idtransportadora', 'idrepresentante'] as const
    expect(collectFkIds(rows, fields)).toEqual(expect.arrayContaining([ok, missing]))
    const existing = new Set([ok])
    expect(nullMissingFks(rows[0], fields, existing)).toEqual(['identidade'])
    expect(rows[0].identidade).toBeNull()
    expect(rows[0].idrepresentante).toBe(ok)
    expect(nullMissingFks(rows[1], fields, existing)).toEqual(['idrepresentante'])
    expect(rows[1].idrepresentante).toBeNull()
  })

  it('nulls numeric UniPlus FKs that are not destination UUIDs', () => {
    const row = {
      id: 'nf-9',
      idrepresentante: 123,
      idrepresentante2: '456',
      identidade: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    }
    const fields = ['identidade', 'idrepresentante', 'idrepresentante2'] as const
    const collected = collectFkIds([row], fields)
    expect(collected).toContain(row.identidade)
    expect(collected).toContain(destinationId('entidade', '123', 'uniplus'))
    expect(collected).toContain(destinationId('entidade', '456', 'uniplus'))
    const existing = new Set([row.identidade])
    const nulled = nullMissingFks(row, fields, existing)
    expect(nulled).toEqual(expect.arrayContaining(['idrepresentante', 'idrepresentante2']))
    expect(row.idrepresentante).toBeNull()
    expect(row.idrepresentante2).toBeNull()
    expect(row.identidade).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
  })

  it('truncates ean and other varchars to Mais Gestão limits', () => {
    expect(truncateVarchar('123456789012345678', 14)).toBe('12345678901234')
    const coerced = coerceVarcharColumns(
      { ean: '789123456789012345', nome: 'X'.repeat(200), ncm: '12345678901' },
      'produtos'
    )
    expect(coerced.ean).toBe('78912345678901')
    expect(String(coerced.nome).length).toBe(120)
    expect(coerced.ncm).toBe('1234567890')
  })

  it('normalizes chavenfe to 44 digits for notafiscal varchar(44)', () => {
    const digits44 = '35240112345678901234567890123456789012345678'
    expect(normalizeChaveNfe(`NFe${digits44}`)).toBe(digits44)
    expect(normalizeChaveNfe(`${digits44} `)).toBe(digits44)
    const coerced = coerceVarcharColumns(
      {
        chaveNFe: `NFe${digits44}`,
        numeronotafiscal: '123456789012',
        serie: 'SERIE-LONGA',
        endereco: 'R'.repeat(80)
      },
      'notafiscal'
    )
    expect(coerced.chavenfe).toBe(digits44)
    expect(String(coerced.chavenfe).length).toBe(44)
    expect(coerced.numeronotafiscal).toBe('12345678901')
    expect(coerced.serie).toBe('SERIE-')
    expect(String(coerced.endereco).length).toBe(60)

    const picked = pickColumns(
      { id: 'uuid-nf', chavenfe: `NFe${digits44}`, razaosocial: 'A'.repeat(80) },
      ['id', 'idempresa', 'chavenfe', 'razaosocial'],
      'emp-1',
      'notafiscal'
    )
    expect(picked.values[picked.columns.indexOf('chavenfe')]).toBe(digits44)
    expect(String(picked.values[picked.columns.indexOf('razaosocial')]).length).toBe(60)
  })

  it('truncates overflowing varchar values reported by Postgres', () => {
    const columns = ['id', 'chavenfe', 'razaosocial']
    const values: unknown[] = [
      'id-1',
      'NFe35240112345678901234567890123456789012345678XXX',
      'B'.repeat(80)
    ]
    const first = truncateOverflowingValue(columns, values, 44)
    expect(first?.column).toBe('chavenfe')
    expect(String(values[1]).length).toBe(44)
    const second = truncateOverflowingValue(columns, values, 44)
    expect(second?.column).toBe('razaosocial')
    expect(String(values[2]).length).toBe(44)
  })

  it('sorts import kinds so nota_fiscal comes before nota_fiscal_item', () => {
    expect(sortImportKinds(['nota_fiscal_item', 'entidade', 'nota_fiscal'])).toEqual([
      'entidade',
      'nota_fiscal',
      'nota_fiscal_item'
    ])
    expect(sortImportKinds(['entidade', 'plano_contas', 'produto'])[0]).toBe('plano_contas')
    expect(sortImportKinds(['produto', 'cliente', 'taxa_uf'])).toEqual([
      'taxa_uf',
      'cliente',
      'produto'
    ])
    const spec = REQUIRED_PARENT_FKS.nota_fiscal_item
    expect(spec).toEqual({ field: 'idnotafiscal', table: 'notafiscal' })
    expect(coerceFkId(123)).toBeNull()
    expect(resolveScopedFk('idnotafiscal', 77)).toBe(destinationId('nota_fiscal', '77', 'uniplus'))
    expect(coerceFkId('AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE')).toBe(
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    )
  })
})
