import type { CanonicalEntity, SourceEntity } from '@domain/canonical/types'
import { ClienteSchema, ProdutoSchema, TaxaUfSchema } from '@domain/canonical/types'
import { normalizeTaxaUfCodigo } from '@infrastructure/importer/tax-code'
import { CLIPP_SOURCE } from './types'

function asString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value).trim()
}

function digitsOnly(value: unknown): string | undefined {
  const digits = asString(value).replace(/\D/g, '')
  return digits || undefined
}

function cestCodigoDigits(value: unknown): string | undefined {
  const digits = digitsOnly(value)
  if (!digits) return undefined
  return digits.length >= 7 ? digits : digits.padStart(7, '0')
}

function composePhone(ddd: unknown, fone: unknown): string | undefined {
  const d = asString(ddd)
  const f = asString(fone)
  if (!f) return undefined
  return d ? `${d}${f}` : f
}

function pickEmail(raw: Record<string, unknown>): string {
  const cont = asString(raw.EMAIL_CONT)
  const nfe = asString(raw.EMAIL_NFE)
  const email = cont || nfe
  if (email && !email.includes('@')) return ''
  return email
}

function pickPhone(raw: Record<string, unknown>): string | undefined {
  return (
    composePhone(raw.DDD_CELUL, raw.FONE_CELUL) ??
    composePhone(raw.DDD_RESID, raw.FONE_RESID)
  )
}

/** Normaliza data Firebird/JS para YYYY-MM-DD */
export function formatNascimento(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const text = asString(value)
  if (!text) return undefined

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return undefined
}

const UNMAPPED_PF_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'NOME_PAI', label: 'nome do pai' },
  { key: 'NOME_MAE', label: 'nome da mãe' },
  { key: 'PROFISSAO', label: 'profissão' },
  { key: 'RENDA', label: 'renda' },
  { key: 'LOCAL_TRAB', label: 'local de trabalho' },
  { key: 'DATA_ADM', label: 'data de admissão' },
  { key: 'NATUR', label: 'naturalidade' },
  { key: 'FOTO', label: 'foto' }
]

const UNMAPPED_EST_PRODUTO_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'QTD_COMPRA', label: 'qtd compra' },
  { key: 'QTD_ATUAL', label: 'qtd atual' },
  { key: 'QTD_INICIO', label: 'qtd início' },
  { key: 'QTD_RESERV', label: 'qtd reservada' },
  { key: 'QTD_POSVEN', label: 'qtd pós-venda' },
  { key: 'CF', label: 'classificação fiscal (CF)' },
  { key: 'ID_NIVEL1', label: 'nível 1' },
  { key: 'ID_NIVEL2', label: 'nível 2' },
  { key: 'MVA', label: 'MVA' },
  { key: 'FOTO_PRODUTO', label: 'foto' },
  { key: 'ANP', label: 'ANP' },
  { key: 'EXTIPI', label: 'EXTIPI' },
  { key: 'CENQ', label: 'CENQ' },
  { key: 'CONTROLA_LOTE_VENDA', label: 'controla lote venda' },
  { key: 'BAIXA_LOTE_NFV', label: 'baixa lote NFV' },
  { key: 'BAIXA_LOTE_PDV', label: 'baixa lote PDV' },
  { key: 'IND_ESCALA', label: 'indicação escala' },
  { key: 'CNPJ_FABRICANTE', label: 'CNPJ fabricante' },
  { key: 'COD_BENEF', label: 'cód. benefício' },
  { key: 'DATA_IMENDES', label: 'data iMendes' },
  { key: 'STATUS_IMENDES', label: 'status iMendes' },
  { key: 'CONSULTAR_IMENDES', label: 'consultar iMendes' },
  { key: 'REFEICAO_IMENDES', label: 'refeição iMendes' },
  { key: 'CODIGO_IMENDES', label: 'código iMendes' },
  { key: 'ICMS_EFETIVO_EST', label: 'ICMS efetivo EST' },
  { key: 'COD_BENEF_CFE', label: 'cód. benefício CFE' },
  { key: 'UNIDADE_MEDIDA_REF', label: 'unidade medida ref' },
  { key: 'QUANTIDADE_REF', label: 'quantidade ref' },
  { key: 'ID_TRIBUTACAO', label: 'ID tributação' },
  { key: 'PESO_LIQ', label: 'peso líquido' },
  { key: 'CONTROLA_LOCAIS', label: 'controla locais' },
  { key: 'COD_BENEF_ENTRADA', label: 'cód. benefício entrada' },
  { key: 'ALIQUOTA_POR_UF_NFE', label: 'alíquota por UF NF-e' },
  { key: 'ID_TAXA_PRES_UF_NFE', label: 'taxa PRES UF NF-e' },
  { key: 'COD_BENEFICIO_RBC', label: 'cód. benefício RBC' }
]

function unmappedFieldWarnings(
  raw: Record<string, unknown>,
  fields: Array<{ key: string; label: string }>,
  prefix: string
): string[] {
  const present = fields
    .filter(({ key }) => {
      const value = raw[key]
      if (value === null || value === undefined) return false
      if (typeof value === 'string' && !value.trim()) return false
      return true
    })
    .map((f) => f.label)

  if (present.length === 0) return []
  return [`${prefix}: ${present.join(', ')}`]
}

function unmappedPfWarnings(raw: Record<string, unknown>): string[] {
  return unmappedFieldWarnings(
    raw,
    UNMAPPED_PF_FIELDS,
    'Campos TB_CLI_PF sem destino em entidade Mais Gestão'
  )
}

function unmappedEstProdutoWarnings(raw: Record<string, unknown>): string[] {
  return unmappedFieldWarnings(
    raw,
    UNMAPPED_EST_PRODUTO_FIELDS,
    'Campos TB_EST_PRODUTO sem destino em produtos Mais Gestão'
  )
}

function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function asInt(value: unknown): number | undefined {
  const n = asNumber(value)
  if (n === undefined) return undefined
  return Math.trunc(n)
}

function firstChar(value: unknown): string | undefined {
  const text = asString(value).toUpperCase()
  return text ? text.slice(0, 1) : undefined
}

function truncateCode(value: unknown, max: number): string | undefined {
  const text = asString(value)
  return text ? text.slice(0, max) : undefined
}

function isInactiveStatus(status: unknown): boolean {
  if (status === null || status === undefined) return false
  const normalized = String(status).trim().toUpperCase()
  return normalized === 'I' || normalized === '0' || normalized === 'INATIVO' || normalized === 'N'
}

function pickProdutoTaxaUfCodigo(raw: Record<string, unknown>): string | undefined {
  return (
    normalizeTaxaUfCodigo(raw.ID_CTI) ??
    normalizeTaxaUfCodigo(raw.ID_CTI_CFE) ??
    undefined
  )
}

const UF_PAYLOAD_KEYS = [
  ['UF_AC', 'ufAc'],
  ['UF_AL', 'ufAl'],
  ['UF_AM', 'ufAm'],
  ['UF_AP', 'ufAp'],
  ['UF_BA', 'ufBa'],
  ['UF_CE', 'ufCe'],
  ['UF_DF', 'ufDf'],
  ['UF_ES', 'ufEs'],
  ['UF_GO', 'ufGo'],
  ['UF_MA', 'ufMa'],
  ['UF_MG', 'ufMg'],
  ['UF_MS', 'ufMs'],
  ['UF_MT', 'ufMt'],
  ['UF_PA', 'ufPa'],
  ['UF_PB', 'ufPb'],
  ['UF_PE', 'ufPe'],
  ['UF_PI', 'ufPi'],
  ['UF_PR', 'ufPr'],
  ['UF_RJ', 'ufRj'],
  ['UF_RN', 'ufRn'],
  ['UF_RO', 'ufRo'],
  ['UF_RR', 'ufRr'],
  ['UF_RS', 'ufRs'],
  ['UF_SC', 'ufSc'],
  ['UF_SE', 'ufSe'],
  ['UF_SP', 'ufSp'],
  ['UF_TO', 'ufTo']
] as const

export function mapClippEntity(entity: SourceEntity): CanonicalEntity {
  switch (entity.kind) {
    case 'cliente': {
      const warnings: string[] = []
      const cont = asString(entity.raw.EMAIL_CONT)
      if (cont && !cont.includes('@')) {
        warnings.push('E-mail de contato inválido ignorado')
      }
      if (!asString(entity.raw.EMAIL_CONT) && !asString(entity.raw.EMAIL_NFE)) {
        warnings.push('Cliente sem e-mail no Clipp')
      }

      const documento = digitsOnly(entity.raw.CPF)
      if (!documento) {
        warnings.push('CPF ausente em TB_CLI_PF; será usado placeholder no destino')
      }

      const nascimento = formatNascimento(entity.raw.DT_NASCTO)
      if (entity.raw.DT_NASCTO && !nascimento) {
        warnings.push('DT_NASCTO inválida; nascimento ignorado')
      }

      warnings.push(...unmappedPfWarnings(entity.raw))

      const payload = ClienteSchema.parse({
        nome: asString(entity.raw.NOME),
        documento,
        email: pickEmail(entity.raw),
        telefone: pickPhone(entity.raw),
        cidade: undefined,
        uf: undefined,
        endereco: asString(entity.raw.END_LOGRAD) || undefined,
        numero: asString(entity.raw.END_NUMERO) || undefined,
        bairro: asString(entity.raw.END_BAIRRO) || undefined,
        cep: asString(entity.raw.END_CEP) || undefined,
        complemento: asString(entity.raw.END_COMPLE) || undefined,
        rg: asString(entity.raw.IDENTIDADE) || undefined,
        nascimento
      })

      return {
        externalId: entity.externalId,
        sourceSystem: CLIPP_SOURCE,
        kind: 'cliente',
        payload,
        warnings
      }
    }
    case 'produto': {
      const unidade = asString(entity.raw.UNI_MEDIDA) || 'UN'
      const precoRaw = entity.raw.PRC_VENDA
      const preco =
        precoRaw === null || precoRaw === undefined || precoRaw === ''
          ? 0
          : Number(precoRaw)

      const warnings: string[] = []
      if (!Number.isFinite(preco)) {
        warnings.push('Preço inválido; aplicado 0')
      }

      const ncmDigits = digitsOnly(entity.raw.COD_NCM)
      const eanRaw = digitsOnly(entity.raw.COD_BARRA) || asString(entity.raw.COD_BARRA)
      const referencia = asString(entity.raw.REFERENCIA) || entity.externalId
      const ipi = asNumber(entity.raw.IPI)
      const dataUltimaCompra = formatNascimento(entity.raw.ULT_COMPRA)
      if (entity.raw.ULT_COMPRA && !dataUltimaCompra) {
        warnings.push('ULT_COMPRA inválida; dataultimacompra ignorada')
      }

      const cestCodigo = cestCodigoDigits(entity.raw.COD_CEST)
      const cestRaw = asNumber(entity.raw.COD_CEST)
      const cest = cestRaw === undefined ? undefined : Math.trunc(cestRaw)
      const cfopSaida = digitsOnly(entity.raw.CFOP) || digitsOnly(entity.raw.CFOP_NF)
      const cstPis = digitsOnly(entity.raw.CST_PIS)
      const cstCofins = digitsOnly(entity.raw.CST_COFINS)
      const cstIpi = truncateCode(entity.raw.CST_IPI, 3)
      const situacaoSn = truncateCode(entity.raw.CSOSN, 3)
      const cstCfe =
        truncateCode(entity.raw.CST_CFE, 3) || truncateCode(entity.raw.CSOSN_CFE, 3)
      const aliquotaPis = asNumber(entity.raw.PIS)
      const aliquotaCofins = asNumber(entity.raw.COFINS)

      const inactive =
        isInactiveStatus(entity.raw.STATUS) || isInactiveStatus(entity.raw.STATUS_PRODUTO)

      warnings.push(...unmappedEstProdutoWarnings(entity.raw))

      const payload = ProdutoSchema.parse({
        codigo: entity.externalId,
        descricao: asString(entity.raw.DESCRICAO),
        unidade,
        preco: Number.isFinite(preco) ? preco : 0,
        ncm: ncmDigits,
        referencia,
        ean: eanRaw ? eanRaw.slice(0, 14) : undefined,
        iat: firstChar(entity.raw.IAT),
        ippt: firstChar(entity.raw.IPPT),
        ipi,
        ipiEntrada: ipi,
        percentualIpiSaida: ipi,
        cstIpiSaida: cstIpi,
        cstIpiEntrada: cstIpi,
        situacaoTributaria: truncateCode(entity.raw.CST, 3),
        situacaoTributariaSn: situacaoSn,
        situacaoTributariaSnEntrada: situacaoSn,
        tributacaoEspecialNfceSat: cstCfe,
        cest,
        cestCodigo,
        cfopSaida,
        cstPis,
        cstPisEntrada: cstPis,
        cstCofins,
        cstCofinsEntrada: cstCofins,
        aliquotaPis,
        aliquotaCofins,
        aliquotaPisEntrada: aliquotaPis,
        aliquotaCofinsEntrada: aliquotaCofins,
        taxaUfCodigo: pickProdutoTaxaUfCodigo(entity.raw),
        numeroFci: truncateCode(entity.raw.FCI, 36),
        peso: asNumber(entity.raw.PESO),
        custoMedioInicial: asNumber(entity.raw.PRC_MEDIO),
        quantidadeMinima: asInt(entity.raw.QTD_MINIM),
        dataUltimaCompra,
        valorIpiUltimaNota: asNumber(entity.raw.VLR_IPI),
        observacoes: asString(entity.raw.DESC_CMPL) || undefined,
        inativo: inactive ? 1 : 0
      })

      return {
        externalId: entity.externalId,
        sourceSystem: CLIPP_SOURCE,
        kind: 'produto',
        payload,
        warnings
      }
    }
    case 'taxa_uf': {
      const codigo =
        normalizeTaxaUfCodigo(entity.raw.ID_CTI) ||
        normalizeTaxaUfCodigo(entity.externalId) ||
        entity.externalId.trim().slice(0, 4).toUpperCase()
      const descricao = asString(entity.raw.DESCRICAO) || codigo
      const bcRaw = asString(entity.raw.BC_POR_UF).toUpperCase()
      const ufFields: Record<string, number | undefined> = {}
      for (const [source, dest] of UF_PAYLOAD_KEYS) {
        ufFields[dest] = asNumber(entity.raw[source])
      }

      const payload = TaxaUfSchema.parse({
        codigo,
        descricao,
        baseIcms: asNumber(entity.raw.BASE_ICMS),
        baseIcmsFe: asNumber(entity.raw.BASE_ICMSFE),
        baseIcmsSt: asNumber(entity.raw.BASE_ICMS_ST),
        ...ufFields,
        baseIss: asNumber(entity.raw.BASE_ISS),
        iss: asNumber(entity.raw.ISS),
        porDif: asNumber(entity.raw.POR_DIF) ?? 0,
        bcPorUf: bcRaw ? bcRaw.slice(0, 1) : 'N'
      })

      return {
        externalId: entity.externalId,
        sourceSystem: CLIPP_SOURCE,
        kind: 'taxa_uf',
        payload,
        warnings: []
      }
    }
    default:
      throw new Error(`Entidade não suportada pelo plugin Clipp: ${entity.kind}`)
  }
}
