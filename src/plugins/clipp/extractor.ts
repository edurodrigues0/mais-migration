import type { SourceEntity } from '@domain/canonical/types'
import { normalizeTaxaUfCodigo } from '@infrastructure/importer/tax-code'
import type { ClippConnector } from './connector'
import { rowToRaw, type ClippClienteRow, type ClippEstoqueRow } from './types'

const CLIENTES_SQL = `
  SELECT
    C.ID_CLIENTE,
    C.NOME,
    C.EMAIL_CONT,
    C.EMAIL_NFE,
    C.DDD_CELUL,
    C.FONE_CELUL,
    C.DDD_RESID,
    C.FONE_RESID,
    C.STATUS,
    C.END_LOGRAD,
    C.END_NUMERO,
    C.END_BAIRRO,
    C.END_CEP,
    C.END_COMPLE,
    PF.CPF,
    PF.IDENTIDADE,
    PF.DT_NASCTO,
    PF.NOME_PAI,
    PF.NOME_MAE,
    PF.PROFISSAO,
    PF.RENDA,
    PF.LOCAL_TRAB,
    PF.DATA_ADM,
    PF.NATUR,
    PF.FOTO
  FROM TB_CLIENTE C
  LEFT JOIN TB_CLI_PF PF ON PF.ID_CLIENTE = C.ID_CLIENTE
`

const ESTOQUE_SQL = `
  SELECT
    E.ID_ESTOQUE,
    E.DESCRICAO,
    E.PRC_VENDA,
    E.UNI_MEDIDA,
    E.STATUS,
    E.CFOP,
    E.CFOP_NF,
    E.CST_PIS,
    E.CST_COFINS,
    E.PIS,
    E.COFINS,
    E.ID_CTI,
    E.ID_CTI_CFE,
    P.ID_IDENTIFICADOR,
    P.DESC_CMPL,
    P.COD_BARRA,
    P.REFERENCIA,
    P.PRC_MEDIO,
    P.QTD_COMPRA,
    P.QTD_ATUAL,
    P.QTD_MINIM,
    P.QTD_INICIO,
    P.QTD_RESERV,
    P.QTD_POSVEN,
    P.ULT_COMPRA,
    P.PESO,
    P.IPI,
    P.CF,
    P.IAT,
    P.IPPT,
    P.COD_NCM,
    P.ID_NIVEL1,
    P.ID_NIVEL2,
    P.MVA,
    P.CST_IPI,
    P.FOTO AS FOTO_PRODUTO,
    P.CSOSN,
    P.ANP,
    P.EXTIPI,
    P.CST,
    P.FCI,
    P.COD_CEST,
    P.CENQ,
    P.VLR_IPI,
    P.CST_CFE,
    P.CSOSN_CFE,
    P.CONTROLA_LOTE_VENDA,
    P.BAIXA_LOTE_NFV,
    P.BAIXA_LOTE_PDV,
    P.IND_ESCALA,
    P.CNPJ_FABRICANTE,
    P.COD_BENEF,
    P.DATA_IMENDES,
    P.STATUS_IMENDES,
    P.CONSULTAR_IMENDES,
    P.REFEICAO_IMENDES,
    P.CODIGO_IMENDES,
    P.ICMS_EFETIVO_EST,
    P.COD_BENEF_CFE,
    P.UNIDADE_MEDIDA_REF,
    P.QUANTIDADE_REF,
    P.ID_TRIBUTACAO,
    P.STATUS AS STATUS_PRODUTO,
    P.PESO_LIQ,
    P.CONTROLA_LOCAIS,
    P.COD_BENEF_ENTRADA,
    P.ALIQUOTA_POR_UF_NFE,
    P.ID_TAXA_PRES_UF_NFE,
    P.COD_BENEFICIO_RBC
  FROM TB_ESTOQUE E
  INNER JOIN TB_EST_PRODUTO P ON P.ID_IDENTIFICADOR = E.ID_ESTOQUE
`

const TAXA_UF_SQL = `
  SELECT
    T.ID_CTI,
    T.DESCRICAO,
    T.BASE_ICMS,
    T.BASE_ICMSFE,
    T.BASE_ICMS_ST,
    T.UF_AC, T.UF_AL, T.UF_AM, T.UF_AP, T.UF_BA, T.UF_CE, T.UF_DF, T.UF_ES, T.UF_GO,
    T.UF_MA, T.UF_MG, T.UF_MS, T.UF_MT, T.UF_PA, T.UF_PB, T.UF_PE, T.UF_PI, T.UF_PR,
    T.UF_RJ, T.UF_RN, T.UF_RO, T.UF_RR, T.UF_RS, T.UF_SC, T.UF_SE, T.UF_SP, T.UF_TO,
    T.BASE_ISS,
    T.ISS,
    T.POR_DIF,
    T.BC_POR_UF
  FROM TB_TAXA_UF T
`

const TAXA_UF_SQL_MINIMAL = `
  SELECT
    T.ID_CTI,
    T.DESCRICAO,
    T.BASE_ICMS,
    T.BASE_ICMSFE,
    T.BASE_ICMS_ST,
    T.POR_DIF,
    T.BC_POR_UF
  FROM TB_TAXA_UF T
`

function isMissingTaxaUfTable(message: string): boolean {
  return /TB_TAXA_UF/i.test(message) && /table unknown|does not exist|-204/i.test(message)
}

async function queryTaxaUfRows(
  connector: ClippConnector
): Promise<Array<Record<string, unknown>>> {
  try {
    return await connector.query<Record<string, unknown>>(TAXA_UF_SQL)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (isMissingTaxaUfTable(message)) return []
    try {
      return await connector.query<Record<string, unknown>>(TAXA_UF_SQL_MINIMAL)
    } catch (retryError) {
      const retryMessage = retryError instanceof Error ? retryError.message : String(retryError)
      if (isMissingTaxaUfTable(retryMessage)) return []
      throw new Error(`Falha ao ler TB_TAXA_UF: ${retryMessage}`)
    }
  }
}

export async function* extractClippEntities(
  connector: ClippConnector
): AsyncGenerator<SourceEntity> {
  const clientes = await connector.query<ClippClienteRow>(CLIENTES_SQL)
  for (const row of clientes) {
    const raw = rowToRaw(row as unknown as Record<string, unknown>)
    yield {
      externalId: String(raw.ID_CLIENTE ?? ''),
      kind: 'cliente',
      raw
    }
  }

  const taxas = await queryTaxaUfRows(connector)
  for (const row of taxas) {
    const raw = rowToRaw(row)
    const externalId = normalizeTaxaUfCodigo(raw.ID_CTI)
    if (!externalId) continue
    yield {
      externalId,
      kind: 'taxa_uf',
      raw
    }
  }

  const estoque = await connector.query<ClippEstoqueRow>(ESTOQUE_SQL)
  for (const row of estoque) {
    const raw = rowToRaw(row as unknown as Record<string, unknown>)
    yield {
      externalId: String(raw.ID_ESTOQUE ?? ''),
      kind: 'produto',
      raw
    }
  }
}

function countFromRow(row: Record<string, unknown> | undefined): number {
  if (!row) return 0
  const raw = row.CNT ?? row.cnt ?? row.COUNT ?? row.count
  const n = Number(raw ?? 0)
  return Number.isFinite(n) ? n : 0
}

export async function countClippExtractable(connector: ClippConnector): Promise<number> {
  const clientes = await connector.query<Record<string, unknown>>(
    'SELECT COUNT(*) AS CNT FROM TB_CLIENTE'
  )
  let taxaCount = 0
  try {
    const taxas = await connector.query<Record<string, unknown>>(
      'SELECT COUNT(*) AS CNT FROM TB_TAXA_UF'
    )
    taxaCount = countFromRow(taxas[0])
  } catch {
    taxaCount = 0
  }
  const estoque = await connector.query<Record<string, unknown>>(
    `SELECT COUNT(*) AS CNT
     FROM TB_ESTOQUE E
     INNER JOIN TB_EST_PRODUTO P ON P.ID_IDENTIFICADOR = E.ID_ESTOQUE`
  )
  return countFromRow(clientes[0]) + taxaCount + countFromRow(estoque[0])
}
