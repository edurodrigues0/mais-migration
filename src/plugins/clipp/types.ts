export const CLIPP_SOURCE = 'clipp'

export const CLIPP_DEFAULTS = {
  host: '127.0.0.1',
  port: '3050',
  user: 'masterkey',
  password: 'masterkey'
} as const

/** Colunas usadas de TB_CLIENTE + TB_CLI_PF (LEFT JOIN) */
export interface ClippClienteRow {
  ID_CLIENTE: number | string
  NOME: string | null
  EMAIL_CONT: string | null
  EMAIL_NFE: string | null
  DDD_CELUL: string | number | null
  FONE_CELUL: string | number | null
  DDD_RESID: string | number | null
  FONE_RESID: string | number | null
  STATUS: string | number | null
  END_LOGRAD: string | null
  END_NUMERO: string | null
  END_BAIRRO: string | null
  END_CEP: string | null
  END_COMPLE: string | null
  /** TB_CLI_PF */
  CPF: string | null
  IDENTIDADE: string | null
  DT_NASCTO: string | Date | null
  NOME_PAI: string | null
  NOME_MAE: string | null
  PROFISSAO: string | null
  RENDA: string | number | null
  LOCAL_TRAB: string | null
  DATA_ADM: string | Date | null
  NATUR: string | null
  FOTO: unknown
}

/** Colunas usadas de TB_ESTOQUE + TB_EST_PRODUTO (INNER JOIN) */
export interface ClippEstoqueRow {
  ID_ESTOQUE: number | string
  DESCRICAO: string | null
  PRC_VENDA: number | string | null
  UNI_MEDIDA: string | null
  STATUS: string | number | null
  CFOP: string | number | null
  CFOP_NF: string | number | null
  CST_PIS: string | number | null
  CST_COFINS: string | number | null
  PIS: number | string | null
  COFINS: number | string | null
  ID_CTI: string | null
  ID_CTI_CFE: string | null
  /** TB_EST_PRODUTO */
  ID_IDENTIFICADOR: number | string | null
  DESC_CMPL: string | null
  COD_BARRA: string | null
  REFERENCIA: string | null
  PRC_MEDIO: number | string | null
  QTD_COMPRA: number | string | null
  QTD_ATUAL: number | string | null
  QTD_MINIM: number | string | null
  QTD_INICIO: number | string | null
  QTD_RESERV: number | string | null
  QTD_POSVEN: number | string | null
  ULT_COMPRA: string | Date | null
  PESO: number | string | null
  IPI: number | string | null
  CF: string | number | null
  IAT: string | null
  IPPT: string | null
  COD_NCM: string | null
  ID_NIVEL1: number | string | null
  ID_NIVEL2: number | string | null
  MVA: number | string | null
  CST_IPI: string | null
  FOTO_PRODUTO: unknown
  CSOSN: string | null
  ANP: string | null
  EXTIPI: string | null
  CST: string | null
  FCI: string | null
  COD_CEST: string | number | null
  CENQ: string | null
  VLR_IPI: number | string | null
  CST_CFE: string | null
  CSOSN_CFE: string | null
  CONTROLA_LOTE_VENDA: string | number | null
  BAIXA_LOTE_NFV: string | number | null
  BAIXA_LOTE_PDV: string | number | null
  IND_ESCALA: string | null
  CNPJ_FABRICANTE: string | null
  COD_BENEF: string | null
  DATA_IMENDES: string | Date | null
  STATUS_IMENDES: string | number | null
  CONSULTAR_IMENDES: string | number | null
  REFEICAO_IMENDES: string | number | null
  CODIGO_IMENDES: string | null
  ICMS_EFETIVO_EST: number | string | null
  COD_BENEF_CFE: string | null
  UNIDADE_MEDIDA_REF: string | null
  QUANTIDADE_REF: number | string | null
  ID_TRIBUTACAO: number | string | null
  STATUS_PRODUTO: string | number | null
  PESO_LIQ: number | string | null
  CONTROLA_LOCAIS: string | number | null
  COD_BENEF_ENTRADA: string | null
  ALIQUOTA_POR_UF_NFE: string | number | null
  ID_TAXA_PRES_UF_NFE: number | string | null
  COD_BENEFICIO_RBC: string | null
}

export function rowToRaw(row: Record<string, unknown>): Record<string, unknown> {
  const raw: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    raw[key.toUpperCase()] = value
  }
  return raw
}
