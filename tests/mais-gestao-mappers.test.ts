import { describe, expect, it } from 'vitest'
import type { CanonicalEntity, Cliente, Produto, TaxaUf } from '@domain/canonical/types'
import {
  destinationClienteId,
  destinationProdutoId,
  destinationTaxaUfId,
  isUuid,
  mapClienteToEntidade,
  mapProdutoToProdutos,
  mapTaxaUfToRow
} from '@infrastructure/importer/mais-gestao-mappers'

describe('mais gestao mappers', () => {
  it('maps cliente without documento to placeholder', () => {
    const entity: CanonicalEntity<Cliente> = {
      externalId: '10',
      sourceSystem: 'clipp',
      kind: 'cliente',
      payload: {
        nome: 'Maria Souza',
        email: 'maria@loja.com',
        telefone: '11999990000',
        endereco: 'Rua A',
        numero: '100',
        bairro: 'Centro',
        cep: '01001000',
        complemento: 'Sala 1'
      },
      warnings: []
    }

    const row = mapClienteToEntidade(entity, 'emp-1')
    expect(isUuid(row.id)).toBe(true)
    expect(row.id).toBe(destinationClienteId('10', 'clipp'))
    expect(row.cnpjcpf).toBe('CLIPP-10')
    expect(row.rg).toBeNull()
    expect(row.nascimento).toBeNull()
    expect(row.warning).toMatch(/placeholder/i)
  })

  it('maps cliente with CPF RG and nascimento from TB_CLI_PF', () => {
    const entity: CanonicalEntity<Cliente> = {
      externalId: '11',
      sourceSystem: 'clipp',
      kind: 'cliente',
      payload: {
        nome: 'João Silva',
        documento: '12345678909',
        rg: 'MG-12345678',
        nascimento: '1990-05-20',
        email: 'joao@email.com'
      },
      warnings: []
    }

    const row = mapClienteToEntidade(entity, 'emp-1')
    expect(row.cnpjcpf).toBe('12345678909')
    expect(row.rg).toBe('MG-12345678')
    expect(row.nascimento).toBe('1990-05-20')
    expect(row.tipopessoa).toBe(0)
    expect(row.warning).toBeUndefined()
  })

  it('maps produto to produtos with UUID id', () => {
    const entity: CanonicalEntity<Produto> = {
      externalId: '55',
      sourceSystem: 'clipp',
      kind: 'produto',
      payload: {
        codigo: '55',
        descricao: 'Caneta Azul',
        unidade: 'UN',
        preco: 2.5
      },
      warnings: []
    }

    const row = mapProdutoToProdutos(entity, 'emp-1')
    expect(isUuid(row.id)).toBe(true)
    expect(row.id).toBe(destinationProdutoId('55', 'clipp'))
    expect(row.codigo).toBe(55)
    expect(row.nome).toBe('Caneta Azul')
    expect(row.preco).toBe('2.50')
    expect(row.referencia).toBe('55')
    expect(row.tipo).toBe('P')
    expect(row.tipoproduto).toBe('01')
    expect(row.ncm).toBeNull()
    expect(row.ean).toBeNull()
  })

  it('maps produto with TB_EST_PRODUTO fields to produtos columns', () => {
    const entity: CanonicalEntity<Produto> = {
      externalId: '56',
      sourceSystem: 'clipp',
      kind: 'produto',
      payload: {
        codigo: '56',
        descricao: 'Caderno A4',
        unidade: 'UN',
        preco: 15.9,
        referencia: 'CAD-A4',
        ean: '7891234567890',
        ncm: '48201000',
        iat: 'T',
        ippt: 'T',
        ipi: 5,
        percentualIpiSaida: 5,
        cstIpiSaida: '99',
        situacaoTributaria: '00',
        situacaoTributariaSn: '102',
        tributacaoEspecialNfceSat: '102',
        cest: 2806100,
        numeroFci: 'B01F8C09-8B8B-4C8A-9C9C-1234567890AB',
        peso: 0.35,
        custoMedioInicial: 10.5,
        quantidadeMinima: 3,
        dataUltimaCompra: '2024-01-15',
        valorIpiUltimaNota: 1.25,
        observacoes: 'Capa dura',
        inativo: 0
      },
      warnings: []
    }

    const row = mapProdutoToProdutos(entity, 'emp-1')
    expect(row.referencia).toBe('CAD-A4')
    expect(row.ean).toBe('7891234567890')
    expect(row.ncm).toBe('48201000')
    expect(row.iat).toBe('T')
    expect(row.ippt).toBe('T')
    expect(row.ipi).toBe('5.00')
    expect(row.ipientrada).toBe('5.00')
    expect(row.percentualipisaida).toBe('5.00')
    expect(row.cstipisaida).toBe('99')
    expect(row.cstipientrada).toBe('99')
    expect(row.situacaotributaria).toBe('00')
    expect(row.situacaotributariasn).toBe('102')
    expect(row.situacaotributariasnentrada).toBe('102')
    expect(row.tributacaosn).toBe('102')
    expect(row.tributacaoespecialnfcesat).toBe('102')
    expect(row.cest).toBe(2806100)
    expect(row.peso).toBe('0.35')
    expect(row.customedioinicial).toBe('10.50')
    expect(row.quantidademinima).toBe(3)
    expect(row.dataultimacompra).toBe('2024-01-15')
    expect(row.valoripiultimanota).toBe('1.25')
    expect(row.observacoes).toBe('Capa dura')
    expect(row.idcest).toBeNull()
    expect(row.idcfopsaida).toBeNull()
  })

  it('maps PIS/COFINS CST codes to numeric dest columns', () => {
    const entity: CanonicalEntity<Produto> = {
      externalId: '1',
      sourceSystem: 'clipp',
      kind: 'produto',
      payload: {
        codigo: '1',
        descricao: 'COCA COLA VIDRO 1L',
        unidade: 'UN',
        preco: 8,
        cfopSaida: '5405',
        cestCodigo: '0301000',
        cest: 301000,
        situacaoTributaria: '060',
        situacaoTributariaSn: '500',
        tributacaoEspecialNfceSat: '060',
        cstPis: '01',
        cstPisEntrada: '01',
        cstCofins: '01',
        cstCofinsEntrada: '01',
        aliquotaPis: 1.65,
        aliquotaCofins: 7.6
      },
      warnings: []
    }

    const row = mapProdutoToProdutos(entity, 'emp-1')
    expect(row.situacaotributaria).toBe('060')
    expect(row.situacaotributariasn).toBe('500')
    expect(row.situacaotributariasnentrada).toBe('500')
    expect(row.tributacaoespecialnfcesat).toBe('060')
    expect(row.cest).toBe(301000)
    expect(row.cstpis).toBe('1.00')
    expect(row.cstpisentrada).toBe('1.00')
    expect(row.cstcofins).toBe('1.00')
    expect(row.cstcofinsentrada).toBe('1.00')
    expect(row.aliquotapis).toBe('1.65')
    expect(row.aliquotacofins).toBe('7.60')
    expect(row.aliquotapisentrada).toBe('1.65')
    expect(row.aliquotaconfinsentrada).toBe('7.60')
    expect(row.idcest).toBeNull()
    expect(row.idcfopsaida).toBeNull()
    expect(row.idtaxauf).toBeNull()
  })

  it('maps taxa UF T00 to taxauf row', () => {
    const entity: CanonicalEntity<TaxaUf> = {
      externalId: 'T00',
      sourceSystem: 'clipp',
      kind: 'taxa_uf',
      payload: {
        codigo: 'T00',
        descricao: 'Alíquota 00 do ECF',
        porDif: 0,
        bcPorUf: 'N'
      },
      warnings: []
    }
    const row = mapTaxaUfToRow(entity, 'emp-1')
    expect(row.codigo).toBe('T00')
    expect(row.descricao).toBe('Alíquota 00 do ECF')
    expect(row.bcporuf).toBe('N')
    expect(row.pordif).toBe('0.0000')
    expect(row.idempresa).toBe('emp-1')
    expect(row.id).toBe(destinationTaxaUfId('T00', 'clipp'))
  })

  it('normalizes padded taxa UF codigo on taxauf row', () => {
    const entity: CanonicalEntity<TaxaUf> = {
      externalId: 'FFF',
      sourceSystem: 'clipp',
      kind: 'taxa_uf',
      payload: {
        codigo: 'fff ',
        descricao: 'Aliquota FFF',
        porDif: 0,
        bcPorUf: 'N'
      },
      warnings: []
    }
    expect(mapTaxaUfToRow(entity, 'emp-1').codigo).toBe('FFF')
  })

  it('generates stable UUIDs for the same external id', () => {
    expect(destinationClienteId('10')).toBe(destinationClienteId('10'))
    expect(destinationProdutoId('55')).toBe(destinationProdutoId('55'))
    expect(destinationClienteId('10')).not.toBe(destinationProdutoId('10'))
  })
})
