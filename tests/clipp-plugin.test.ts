import { describe, expect, it } from 'vitest'
import type { SourceEntity } from '@domain/canonical/types'
import { formatNascimento, mapClippEntity } from '@plugins/clipp/mapper'
import { validateClippEntity } from '@plugins/clipp/validator'

const clienteSemPf: SourceEntity = {
  externalId: '10',
  kind: 'cliente',
  raw: {
    ID_CLIENTE: 10,
    NOME: ' Maria Souza ',
    EMAIL_CONT: 'maria@loja.com',
    EMAIL_NFE: null,
    DDD_CELUL: '11',
    FONE_CELUL: '988887777',
    DDD_RESID: '11',
    FONE_RESID: '33334444',
    STATUS: 'A',
    END_LOGRAD: 'Rua das Flores',
    END_NUMERO: '123',
    END_BAIRRO: 'Centro',
    END_CEP: '01001-000',
    END_COMPLE: 'Apto 2',
    CPF: null,
    IDENTIDADE: null,
    DT_NASCTO: null
  }
}

const clienteComPf: SourceEntity = {
  externalId: '11',
  kind: 'cliente',
  raw: {
    ID_CLIENTE: 11,
    NOME: 'João Silva',
    EMAIL_CONT: 'joao@email.com',
    EMAIL_NFE: null,
    DDD_CELUL: '11',
    FONE_CELUL: '900001111',
    DDD_RESID: null,
    FONE_RESID: null,
    STATUS: 'A',
    END_LOGRAD: 'Av Brasil',
    END_NUMERO: '50',
    END_BAIRRO: 'Jardins',
    END_CEP: '01400-000',
    END_COMPLE: null,
    CPF: '123.456.789-09',
    IDENTIDADE: 'MG-12.345.678',
    DT_NASCTO: '1990-05-20',
    NOME_PAI: 'Carlos Silva',
    NOME_MAE: 'Ana Silva',
    PROFISSAO: 'Analista',
    RENDA: 5000,
    LOCAL_TRAB: 'Empresa X',
    DATA_ADM: '2018-01-10',
    NATUR: 'São Paulo',
    FOTO: Buffer.from('x')
  }
}

const produtoFixture: SourceEntity = {
  externalId: '55',
  kind: 'produto',
  raw: {
    ID_ESTOQUE: 55,
    DESCRICAO: 'Caneta Azul',
    PRC_VENDA: 2.5,
    UNI_MEDIDA: 'UN',
    STATUS: 'A'
  }
}

const produtoComEstProduto: SourceEntity = {
  externalId: '56',
  kind: 'produto',
  raw: {
    ID_ESTOQUE: 56,
    DESCRICAO: 'Caderno A4',
    PRC_VENDA: 15.9,
    UNI_MEDIDA: 'UN',
    STATUS: 'A',
    ID_IDENTIFICADOR: 56,
    DESC_CMPL: 'Capa dura',
    COD_BARRA: '7891234567890',
    REFERENCIA: 'CAD-A4',
    PRC_MEDIO: 10.5,
    QTD_MINIM: 3,
    QTD_ATUAL: 40,
    ULT_COMPRA: '2024-01-15',
    PESO: 0.35,
    IPI: 5,
    IAT: 'T',
    IPPT: 'T',
    COD_NCM: '4820.10.00',
    CST_IPI: '99',
    CSOSN: '102',
    CST: '00',
    FCI: 'B01F8C09-8B8B-4C8A-9C9C-1234567890AB',
    COD_CEST: 2806100,
    VLR_IPI: 1.25,
    CSOSN_CFE: '102',
    STATUS_PRODUTO: 'A',
    MVA: 40,
    ID_TRIBUTACAO: 1,
    CFOP: 5102,
    CST_PIS: '01',
    CST_COFINS: '01',
    PIS: 1.65,
    COFINS: 7.6
  }
}

describe('clipp mapper/validator', () => {
  it('maps cliente without TB_CLI_PF and warns about missing CPF', () => {
    const validation = validateClippEntity(clienteSemPf)
    expect(validation.valid).toBe(true)

    const canonical = mapClippEntity(clienteSemPf)
    expect(canonical.payload).toMatchObject({
      nome: 'Maria Souza',
      email: 'maria@loja.com',
      telefone: '11988887777',
      endereco: 'Rua das Flores'
    })
    expect((canonical.payload as { documento?: string }).documento).toBeUndefined()
    expect(canonical.warnings.some((w) => /CPF ausente/i.test(w))).toBe(true)
  })

  it('maps cliente with TB_CLI_PF CPF RG and nascimento', () => {
    const canonical = mapClippEntity(clienteComPf)
    expect(canonical.payload).toMatchObject({
      nome: 'João Silva',
      documento: '12345678909',
      rg: 'MG-12.345.678',
      nascimento: '1990-05-20'
    })
    expect(canonical.warnings.some((w) => /CPF ausente/i.test(w))).toBe(false)
    expect(canonical.warnings.some((w) => /sem destino em entidade/i.test(w))).toBe(true)
    expect(canonical.warnings.some((w) => /nome do pai/i.test(w))).toBe(true)
  })

  it('formats nascimento from BR date', () => {
    expect(formatNascimento('20/05/1990')).toBe('1990-05-20')
  })

  it('validates and maps produto from TB_ESTOQUE columns', () => {
    const validation = validateClippEntity(produtoFixture)
    expect(validation.valid).toBe(true)

    const canonical = mapClippEntity(produtoFixture)
    expect(canonical.kind).toBe('produto')
    expect(canonical.payload).toMatchObject({
      codigo: '55',
      descricao: 'Caneta Azul',
      unidade: 'UN',
      preco: 2.5,
      referencia: '55',
      inativo: 0
    })
  })

  it('maps produto with TB_EST_PRODUTO fiscal and stock fields', () => {
    const canonical = mapClippEntity(produtoComEstProduto)
    expect(canonical.payload).toMatchObject({
      codigo: '56',
      descricao: 'Caderno A4',
      referencia: 'CAD-A4',
      ean: '7891234567890',
      ncm: '48201000',
      iat: 'T',
      ippt: 'T',
      ipi: 5,
      ipiEntrada: 5,
      percentualIpiSaida: 5,
      cstIpiSaida: '99',
      cstIpiEntrada: '99',
      situacaoTributaria: '00',
      situacaoTributariaSn: '102',
      situacaoTributariaSnEntrada: '102',
      tributacaoEspecialNfceSat: '102',
      cest: 2806100,
      peso: 0.35,
      custoMedioInicial: 10.5,
      quantidadeMinima: 3,
      dataUltimaCompra: '2024-01-15',
      valorIpiUltimaNota: 1.25,
      observacoes: 'Capa dura',
      inativo: 0,
      cfopSaida: '5102',
      cestCodigo: '2806100',
      cstPis: '01',
      cstPisEntrada: '01',
      cstCofins: '01',
      cstCofinsEntrada: '01',
      aliquotaPis: 1.65,
      aliquotaCofins: 7.6,
      aliquotaPisEntrada: 1.65,
      aliquotaCofinsEntrada: 7.6
    })
    expect(canonical.warnings.some((w) => /TB_EST_PRODUTO sem destino/i.test(w))).toBe(true)
    expect(canonical.warnings.some((w) => /qtd atual/i.test(w))).toBe(true)
    expect(canonical.warnings.some((w) => /MVA/i.test(w))).toBe(true)
  })

  it('maps Coca-Cola sample tax fields from TB_ESTOQUE + TB_EST_PRODUTO', () => {
    const coca: SourceEntity = {
      externalId: '1',
      kind: 'produto',
      raw: {
        ID_ESTOQUE: 1,
        DESCRICAO: 'COCA COLA VIDRO 1L',
        PRC_VENDA: 8,
        UNI_MEDIDA: 'UN',
        STATUS: 'A',
        CFOP: 5405,
        CFOP_NF: 5405,
        CST_PIS: null,
        CST_COFINS: null,
        ID_IDENTIFICADOR: 1,
        COD_BARRA: '7894900015126',
        IAT: 'A',
        IPPT: 'T',
        COD_NCM: '04022110',
        CST_IPI: null,
        CSOSN: 500,
        CST: '060',
        COD_CEST: '0301000',
        VLR_IPI: 0,
        CST_CFE: '060',
        CSOSN_CFE: 500,
        STATUS_PRODUTO: 'A',
        ID_CTI: 'fff '
      }
    }

    const canonical = mapClippEntity(coca)
    expect(canonical.payload).toMatchObject({
      descricao: 'COCA COLA VIDRO 1L',
      situacaoTributaria: '060',
      situacaoTributariaSn: '500',
      situacaoTributariaSnEntrada: '500',
      tributacaoEspecialNfceSat: '060',
      cest: 301000,
      cestCodigo: '0301000',
      cfopSaida: '5405',
      ean: '7894900015126',
      ncm: '04022110',
      taxaUfCodigo: 'FFF'
    })
    expect((canonical.payload as { cstPis?: string }).cstPis).toBeUndefined()
    expect((canonical.payload as { cstCofins?: string }).cstCofins).toBeUndefined()
    expect((canonical.payload as { cstIpiSaida?: string }).cstIpiSaida).toBeUndefined()
  })

  it('uses ID_CTI_CFE when ID_CTI is empty', () => {
    const product: SourceEntity = {
      externalId: '2',
      kind: 'produto',
      raw: {
        ID_ESTOQUE: 2,
        DESCRICAO: 'Produto NFC-e',
        PRC_VENDA: 1,
        UNI_MEDIDA: 'UN',
        STATUS: 'A',
        ID_CTI: '  ',
        ID_CTI_CFE: 't00'
      }
    }
    expect(mapClippEntity(product).payload).toMatchObject({ taxaUfCodigo: 'T00' })
  })

  it('maps TB_TAXA_UF to taxa_uf payload', () => {
    const taxa: SourceEntity = {
      externalId: 'T00',
      kind: 'taxa_uf',
      raw: {
        ID_CTI: 'T00',
        DESCRICAO: 'Alíquota 00 do ECF',
        BASE_ICMS: null,
        POR_DIF: 0,
        BC_POR_UF: 'N',
        UF_SP: null
      }
    }
    expect(validateClippEntity(taxa).valid).toBe(true)
    const canonical = mapClippEntity(taxa)
    expect(canonical.kind).toBe('taxa_uf')
    expect(canonical.payload).toMatchObject({
      codigo: 'T00',
      descricao: 'Alíquota 00 do ECF',
      porDif: 0,
      bcPorUf: 'N'
    })
  })

  it('rejects cliente without name', () => {
    const invalid: SourceEntity = {
      ...clienteSemPf,
      raw: { ...clienteSemPf.raw, NOME: '  ' }
    }
    expect(validateClippEntity(invalid).valid).toBe(false)
  })

  it('warns on inactive status without failing validation', () => {
    const inactive: SourceEntity = {
      ...produtoFixture,
      raw: { ...produtoFixture.raw, STATUS: 'I' }
    }
    const result = validateClippEntity(inactive)
    expect(result.valid).toBe(true)
    expect(result.issues.some((i) => i.severity === 'warning')).toBe(true)
  })
})
