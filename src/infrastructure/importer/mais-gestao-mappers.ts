import type { CanonicalEntity, Cliente, Produto, TaxaUf } from '@domain/canonical/types'
import {
  destinationClienteId,
  destinationProdutoId,
  destinationTaxaUfId,
  isUuid
} from '@infrastructure/importer/mais-gestao-ids'
import { normalizeTaxaUfCodigo } from '@infrastructure/importer/tax-code'

export {
  MAIS_MIGRATION_NAMESPACE,
  destinationId,
  destinationClienteId,
  destinationProdutoId,
  destinationTaxaUfId,
  isUuid
} from '@infrastructure/importer/mais-gestao-ids'

function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max)
}

function nowTimestamp(): string {
  return new Date().toISOString()
}

export interface EntidadeRow {
  id: string
  nome: string
  razaosocial: string
  tipopessoa: number
  cnpjcpf: string
  rg: string | null
  nascimento: string | null
  email: string | null
  telefone: string | null
  endereco: string | null
  numeroendereco: string | null
  complemento: string | null
  bairro: string | null
  cep: string | null
  cliente: number
  fornecedor: number
  transportador: number
  representante: number
  idempresa: string
  criadoem: string
  atualizadoem: string
  warning?: string
}

export interface ProdutoRow {
  id: string
  idempresa: string
  descricao: string
  nome: string
  codigo: number | null
  referencia: string
  preco: string
  unidademedida: string
  tipo: string
  tipoproduto: string
  inativo: number
  datacadastro: string
  ean: string | null
  ncm: string | null
  iat: string | null
  ippt: string | null
  ipi: string | null
  ipientrada: string | null
  percentualipisaida: string | null
  cstipisaida: string | null
  cstipientrada: string | null
  situacaotributaria: string | null
  situacaotributariasn: string | null
  situacaotributariasnentrada: string | null
  tributacaosn: string | null
  tributacaoespecialnfcesat: string | null
  cest: number | null
  numerofci: string | null
  peso: string | null
  customedioinicial: string | null
  quantidademinima: number | null
  dataultimacompra: string | null
  valoripiultimanota: string | null
  observacoes: string | null
  cstpis: string | null
  cstpisentrada: string | null
  cstcofins: string | null
  cstcofinsentrada: string | null
  aliquotapis: string | null
  aliquotacofins: string | null
  aliquotapisentrada: string | null
  aliquotaconfinsentrada: string | null
  idcest: string | null
  idcfopsaida: string | null
  idtaxauf: string | null
  warning?: string
}

export interface TaxaUfRow {
  id: string
  idempresa: string
  codigo: string
  descricao: string
  baseicms: string | null
  baseicmsfe: string | null
  baseicmsst: string | null
  uf_ac: string | null
  uf_al: string | null
  uf_am: string | null
  uf_ap: string | null
  uf_ba: string | null
  uf_ce: string | null
  uf_df: string | null
  uf_es: string | null
  uf_go: string | null
  uf_ma: string | null
  uf_mg: string | null
  uf_ms: string | null
  uf_mt: string | null
  uf_pa: string | null
  uf_pb: string | null
  uf_pe: string | null
  uf_pi: string | null
  uf_pr: string | null
  uf_rj: string | null
  uf_rn: string | null
  uf_ro: string | null
  uf_rr: string | null
  uf_rs: string | null
  uf_sc: string | null
  uf_se: string | null
  uf_sp: string | null
  uf_to: string | null
  baseiss: string | null
  iss: string | null
  pordif: string | null
  bcporuf: string
  inativo: number
}

function numericOrNull(value: number | undefined, scale = 2): string | null {
  if (value === undefined || !Number.isFinite(value)) return null
  return value.toFixed(scale)
}

function taxNumeric(value: number | undefined): string | null {
  return numericOrNull(value, 4)
}

/** CST PIS/COFINS no destino é numeric; "01" → "1.00". */
function cstCodeToNumeric(value: string | undefined): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (!digits) return null
  const n = Number(digits)
  if (!Number.isFinite(n)) return null
  return n.toFixed(2)
}

export function mapClienteToEntidade(
  entity: CanonicalEntity<Cliente>,
  idempresa: string
): EntidadeRow {
  const payload = entity.payload
  let cnpjcpf = payload.documento?.replace(/\D/g, '') || ''
  let warning: string | undefined
  if (!cnpjcpf) {
    cnpjcpf = `CLIPP-${entity.externalId}`
    warning = `CPF/CNPJ ausente; placeholder ${cnpjcpf}`
  }

  const ts = nowTimestamp()
  return {
    id: destinationClienteId(entity.externalId, entity.sourceSystem),
    nome: truncate(payload.nome, 120),
    razaosocial: truncate(payload.nome, 120),
    tipopessoa: 0,
    cnpjcpf: truncate(cnpjcpf, 20),
    rg: payload.rg ? truncate(payload.rg, 20) : null,
    nascimento: payload.nascimento || null,
    email: payload.email ? truncate(payload.email, 200) : null,
    telefone: payload.telefone ? truncate(payload.telefone, 40) : null,
    endereco: payload.endereco ? truncate(payload.endereco, 120) : null,
    numeroendereco: payload.numero ? truncate(payload.numero, 20) : null,
    complemento: payload.complemento ? truncate(payload.complemento, 60) : null,
    bairro: payload.bairro ? truncate(payload.bairro, 60) : null,
    cep: payload.cep ? truncate(payload.cep, 9) : null,
    cliente: 1,
    fornecedor: 0,
    transportador: 0,
    representante: 0,
    idempresa,
    criadoem: ts,
    atualizadoem: ts,
    warning
  }
}

export function mapProdutoToProdutos(
  entity: CanonicalEntity<Produto>,
  idempresa: string
): ProdutoRow {
  const payload = entity.payload
  const nome = truncate(payload.descricao || payload.codigo, 120)
  const descricao = truncate(payload.descricao || payload.codigo, 100)
  const codigoNum = Number(payload.codigo)
  const codigo = Number.isFinite(codigoNum) ? Math.trunc(codigoNum) : null
  let warning: string | undefined
  if (codigo === null) {
    warning = `Código não numérico (${payload.codigo}); gravado só em referencia`
  }

  const referencia = truncate(payload.referencia || String(payload.codigo), 60)
  const situacaoSn = payload.situacaoTributariaSn
    ? truncate(payload.situacaoTributariaSn, 3)
    : null

  return {
    id: destinationProdutoId(entity.externalId, entity.sourceSystem),
    idempresa,
    descricao,
    nome,
    codigo,
    referencia,
    preco: Number(payload.preco ?? 0).toFixed(2),
    unidademedida: truncate((payload.unidade || 'UN').toUpperCase(), 6),
    tipo: 'P',
    tipoproduto: '01',
    inativo: payload.inativo === 1 ? 1 : 0,
    datacadastro: nowTimestamp(),
    ean: payload.ean ? truncate(payload.ean, 14) : null,
    ncm: payload.ncm ? truncate(payload.ncm, 10) : null,
    iat: payload.iat ? truncate(payload.iat, 1) : null,
    ippt: payload.ippt ? truncate(payload.ippt, 1) : null,
    ipi: numericOrNull(payload.ipi),
    ipientrada: numericOrNull(payload.ipiEntrada ?? payload.ipi),
    percentualipisaida: numericOrNull(payload.percentualIpiSaida),
    cstipisaida: payload.cstIpiSaida ? truncate(payload.cstIpiSaida, 3) : null,
    cstipientrada: payload.cstIpiEntrada
      ? truncate(payload.cstIpiEntrada, 3)
      : payload.cstIpiSaida
        ? truncate(payload.cstIpiSaida, 3)
        : null,
    situacaotributaria: payload.situacaoTributaria
      ? truncate(payload.situacaoTributaria, 3)
      : null,
    situacaotributariasn: situacaoSn,
    situacaotributariasnentrada: payload.situacaoTributariaSnEntrada
      ? truncate(payload.situacaoTributariaSnEntrada, 3)
      : situacaoSn,
    tributacaosn: situacaoSn,
    tributacaoespecialnfcesat: payload.tributacaoEspecialNfceSat
      ? truncate(payload.tributacaoEspecialNfceSat, 3)
      : null,
    cest: payload.cest ?? null,
    numerofci: payload.numeroFci ? truncate(payload.numeroFci, 36) : null,
    peso: numericOrNull(payload.peso),
    customedioinicial: numericOrNull(payload.custoMedioInicial),
    quantidademinima: payload.quantidadeMinima ?? null,
    dataultimacompra: payload.dataUltimaCompra || null,
    valoripiultimanota: numericOrNull(payload.valorIpiUltimaNota),
    observacoes: payload.observacoes || null,
    cstpis: cstCodeToNumeric(payload.cstPis),
    cstpisentrada: cstCodeToNumeric(payload.cstPisEntrada ?? payload.cstPis),
    cstcofins: cstCodeToNumeric(payload.cstCofins),
    cstcofinsentrada: cstCodeToNumeric(payload.cstCofinsEntrada ?? payload.cstCofins),
    aliquotapis: numericOrNull(payload.aliquotaPis),
    aliquotacofins: numericOrNull(payload.aliquotaCofins),
    aliquotapisentrada: numericOrNull(payload.aliquotaPisEntrada ?? payload.aliquotaPis),
    aliquotaconfinsentrada: numericOrNull(
      payload.aliquotaCofinsEntrada ?? payload.aliquotaCofins
    ),
    idcest: null,
    idcfopsaida: null,
    idtaxauf: null,
    warning
  }
}

export function mapTaxaUfToRow(entity: CanonicalEntity<TaxaUf>, idempresa: string): TaxaUfRow {
  const payload = entity.payload
  const bc = (payload.bcPorUf || 'N').toUpperCase().slice(0, 1)
  return {
    id: destinationTaxaUfId(entity.externalId, entity.sourceSystem),
    idempresa,
    codigo: truncate(normalizeTaxaUfCodigo(payload.codigo) || payload.codigo, 4),
    descricao: payload.descricao,
    baseicms: taxNumeric(payload.baseIcms),
    baseicmsfe: taxNumeric(payload.baseIcmsFe),
    baseicmsst: taxNumeric(payload.baseIcmsSt),
    uf_ac: taxNumeric(payload.ufAc),
    uf_al: taxNumeric(payload.ufAl),
    uf_am: taxNumeric(payload.ufAm),
    uf_ap: taxNumeric(payload.ufAp),
    uf_ba: taxNumeric(payload.ufBa),
    uf_ce: taxNumeric(payload.ufCe),
    uf_df: taxNumeric(payload.ufDf),
    uf_es: taxNumeric(payload.ufEs),
    uf_go: taxNumeric(payload.ufGo),
    uf_ma: taxNumeric(payload.ufMa),
    uf_mg: taxNumeric(payload.ufMg),
    uf_ms: taxNumeric(payload.ufMs),
    uf_mt: taxNumeric(payload.ufMt),
    uf_pa: taxNumeric(payload.ufPa),
    uf_pb: taxNumeric(payload.ufPb),
    uf_pe: taxNumeric(payload.ufPe),
    uf_pi: taxNumeric(payload.ufPi),
    uf_pr: taxNumeric(payload.ufPr),
    uf_rj: taxNumeric(payload.ufRj),
    uf_rn: taxNumeric(payload.ufRn),
    uf_ro: taxNumeric(payload.ufRo),
    uf_rr: taxNumeric(payload.ufRr),
    uf_rs: taxNumeric(payload.ufRs),
    uf_sc: taxNumeric(payload.ufSc),
    uf_se: taxNumeric(payload.ufSe),
    uf_sp: taxNumeric(payload.ufSp),
    uf_to: taxNumeric(payload.ufTo),
    baseiss: taxNumeric(payload.baseIss),
    iss: taxNumeric(payload.iss),
    pordif: taxNumeric(payload.porDif) ?? '0.0000',
    bcporuf: bc === 'S' ? 'S' : 'N',
    inativo: 0
  }
}
