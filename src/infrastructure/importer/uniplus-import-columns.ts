import type { EntityKind } from '@domain/canonical/types'
import { destinationId } from '@infrastructure/importer/mais-gestao-ids'

/** Colunas permitidas no UPSERT (interseção prática UniPlus ↔ Mais Gestão) */
export const UNIPLUS_TABLE_COLUMNS: Record<string, string[]> = {
  planocontas: [
    'id',
    'idempresa',
    'codigo',
    'nome',
    'tipomovimento',
    'inativo',
    'classe',
    'centrocustoobrigatorio',
    'tipoconta',
    'exportaparacontabilidade',
    'idplanocontas'
  ],
  hierarquia: [
    'id',
    'idempresa',
    'codigo',
    'nome',
    'classe',
    'comissao',
    'comissaoavista',
    'comissaoaprazo',
    'comissaoquitacao',
    'ncm',
    'tributacao',
    'tributacaoespecial',
    'tributacaosn',
    'iat',
    'ippt',
    'origem',
    'tipoproduto',
    'ipi',
    'ipientrada',
    'cstpis',
    'aliquotapis',
    'cstcofins',
    'aliquotacofins',
    'enviamobile'
  ],
  entidade: [
    'id',
    'idempresa',
    'nome',
    'razaosocial',
    'tipopessoa',
    'cnpjcpf',
    'inscricaoestadual',
    'rg',
    'endereco',
    'numeroendereco',
    'complemento',
    'bairro',
    'cep',
    'telefone',
    'email',
    'nascimento',
    'cliente',
    'fornecedor',
    'transportador',
    'representante',
    'idplanocontas',
    'criadoem',
    'atualizadoem'
  ],
  produtos: [
    'id',
    'idempresa',
    'descricao',
    'nome',
    'codigo',
    'ean',
    'referencia',
    'preco',
    'unidademedida',
    'tipo',
    'tipoproduto',
    'inativo',
    'ncm',
    'iat',
    'ippt',
    'ipi',
    'percentualipisaida',
    'cstipisaida',
    'situacaotributaria',
    'situacaotributariasn',
    'tributacaosn',
    'tributacao',
    'tributacaoespecial',
    'tributacaoespecialnfcesat',
    'cest',
    'numerofci',
    'peso',
    'customedioinicial',
    'quantidademinima',
    'quantidademaxima',
    'dataultimacompra',
    'valoripiultimanota',
    'observacoes',
    'idgrupo',
    'fornecedor',
    'origem',
    'idplanocontas',
    'datacadastro'
  ],
  notafiscal: [
    'id',
    'idempresa',
    'identidade',
    'tipodocumento',
    'numeronotafiscal',
    'serie',
    'status',
    'emissao',
    'entradasaida',
    'valortotalnota',
    'totalproduto',
    'totalservicos',
    'razaosocial',
    'cnpjcpf',
    'inscricaoestadual',
    'endereco',
    'numeroendereco',
    'bairro',
    'complemento',
    'cep',
    'telefone',
    'chavenfe',
    'modelo',
    'baseicms',
    'icms',
    'ipi',
    'frete',
    'seguro',
    'outrasdespesas',
    'descontoproduto',
    'acrescimosproduto',
    'idtransportadora',
    'idrepresentante',
    'idplanocontas',
    'tipofrete',
    'infocompgerada',
    'observacao'
  ],
  notafiscalitem: [
    'id',
    'idnotafiscal',
    'idproduto',
    'tipo',
    'produto',
    'descricao',
    'precounitario',
    'quantidade',
    'unidade',
    'acrescimo',
    'desconto',
    'total',
    'ncm',
    'cfop',
    'situacaotributaria',
    'situacaotributariasn',
    'tributacao',
    'origem',
    'ipi',
    'icms',
    'percentualicms',
    'baseicms',
    'observacao'
  ],
  financeiro: [
    'id',
    'idempresa',
    'identidade',
    'tipo',
    'tipoorigem',
    'idorigem',
    'parcela',
    'documento',
    'status',
    'emissao',
    'vencimento',
    'vencimentooriginal',
    'pagamento',
    'baixa',
    'valor',
    'saldo',
    'historico',
    'juros',
    'multa',
    'nossonumero',
    'idrepresentante',
    'idplanocontas'
  ],
  financeirolancamento: [
    'id',
    'idfinanceiro',
    'valoranterior',
    'desconto',
    'valor',
    'pagamento',
    'baixa',
    'juros',
    'multa',
    'usuario',
    'cancelado',
    'evento',
    'historico',
    'observacao',
    'valorbaixa',
    'acrescimo'
  ],
  ordemservico: [
    'id',
    'idempresa',
    'idcliente',
    'data',
    'descricaoitem',
    'problemadescrito',
    'servicoexecutado',
    'status',
    'valor',
    'codigo',
    'inicioservico',
    'fimservico',
    'previsaoconclusao',
    'observacao',
    'nomecliente',
    'cnpjcpfcliente',
    'valorprodutos',
    'valorservicos',
    'idproduto',
    'marca',
    'modelo',
    'placa',
    'iddocumentofiscal'
  ],
  ordemservicoevento: [
    'id',
    'idempresa',
    'descricao',
    'data',
    'idordemservico',
    'idtipoevento',
    'nomecontato',
    'datacriacao',
    'dataalteracao'
  ],
  ordemservicofaturamento: [
    'id',
    'idempresa',
    'idordemservico',
    'idnotafiscal',
    'idfaturamento',
    'datacriacao',
    'dataalteracao'
  ],
  ordemservicoitem: [
    'id',
    'idempresa',
    'idordemservico',
    'idproduto',
    'quantidade',
    'preco',
    'total',
    'desconto',
    'acrescimo',
    'observacao',
    'codigorproduto',
    'nomeproduto',
    'unidademedida',
    'cancelado',
    'datainclusao'
  ],
  ordemservicoitemlote: [
    'id',
    'idempresa',
    'codigolote',
    'datalote',
    'emissao',
    'vencimento',
    'idordemservicoitem',
    'quantidade',
    'datacriacao',
    'dataalteracao'
  ],
  tipoordemservicoevento: [
    'id',
    'idempresa',
    'codigo',
    'status',
    'cor',
    'descricao',
    'ordem',
    'ativo',
    'padrao',
    'datacriacao',
    'dataalteracao'
  ]
}

export const KIND_TO_TABLE: Partial<Record<EntityKind, string>> = {
  plano_contas: 'planocontas',
  hierarquia: 'hierarquia',
  entidade: 'entidade',
  produto: 'produtos',
  nota_fiscal: 'notafiscal',
  nota_fiscal_item: 'notafiscalitem',
  financeiro: 'financeiro',
  financeiro_lancamento: 'financeirolancamento',
  ordem_servico: 'ordemservico',
  ordem_servico_evento: 'ordemservicoevento',
  ordem_servico_faturamento: 'ordemservicofaturamento',
  ordem_servico_item: 'ordemservicoitem',
  ordem_servico_item_lote: 'ordemservicoitemlote'
}

/** Ordem de insert */
export const UNIPLUS_IMPORT_ORDER: EntityKind[] = [
  'taxa_uf',
  'plano_contas',
  'hierarquia',
  'cliente',
  'entidade',
  'produto',
  'nota_fiscal',
  'nota_fiscal_item',
  'financeiro',
  'financeiro_lancamento',
  'ordem_servico',
  'ordem_servico_evento',
  'ordem_servico_faturamento',
  'ordem_servico_item',
  'ordem_servico_item_lote'
]

/** Ordem de rollback (inversa) */
export const UNIPLUS_ROLLBACK_ORDER: EntityKind[] = [...UNIPLUS_IMPORT_ORDER].reverse()

export function sortImportKinds(kinds: Iterable<EntityKind>): EntityKind[] {
  const present = new Set(kinds)
  const ordered = UNIPLUS_IMPORT_ORDER.filter((kind) => present.has(kind))
  for (const kind of present) {
    if (!ordered.includes(kind)) ordered.push(kind)
  }
  return ordered
}

/** FKs obrigatórias: sem pai no destino a linha é ignorada (não dá para anular NOT NULL). */
export const REQUIRED_PARENT_FKS: Partial<Record<EntityKind, { field: string; table: string }>> = {
  nota_fiscal_item: { field: 'idnotafiscal', table: 'notafiscal' },
  financeiro_lancamento: { field: 'idfinanceiro', table: 'financeiro' },
  ordem_servico_evento: { field: 'idordemservico', table: 'ordemservico' },
  ordem_servico_faturamento: { field: 'idordemservico', table: 'ordemservico' },
  ordem_servico_item: { field: 'idordemservico', table: 'ordemservico' },
  ordem_servico_item_lote: { field: 'idordemservicoitem', table: 'ordemservicoitem' }
}

export const OPTIONAL_PRODUTO_FKS: Partial<Record<EntityKind, readonly string[]>> = {
  nota_fiscal_item: ['idproduto', 'idprodutokit'],
  ordem_servico: ['idproduto'],
  ordem_servico_item: ['idproduto']
}

export const OPTIONAL_NOTA_FKS: Partial<Record<EntityKind, readonly string[]>> = {
  financeiro: ['idorigem'],
  ordem_servico: ['iddocumentofiscal'],
  ordem_servico_faturamento: ['idnotafiscal']
}

export const OPTIONAL_FINANCEIRO_FKS: Partial<Record<EntityKind, readonly string[]>> = {
  ordem_servico_faturamento: ['idfaturamento']
}

/**
 * Colunas integer/smallint/bigint no destino Mais Gestão (allowlist atual).
 * UniPlus frequentemente envia numeric como "0.000000".
 */
export const INTEGER_COLUMNS_BY_TABLE: Record<string, readonly string[]> = {
  planocontas: ['inativo', 'centrocustoobrigatorio', 'tipoconta', 'exportaparacontabilidade'],
  hierarquia: ['classe', 'origem', 'enviamobile'],
  entidade: ['tipopessoa', 'cliente', 'fornecedor', 'transportador', 'representante'],
  produtos: [
    'codigo',
    'inativo',
    'cest',
    'quantidademinima',
    'quantidademaxima',
    'origem'
  ],
  notafiscal: ['status', 'tipofrete'],
  notafiscalitem: ['origem'],
  financeiro: ['tipoorigem', 'parcela'],
  financeirolancamento: ['cancelado', 'evento'],
  ordemservico: ['status', 'codigo'],
  ordemservicoevento: [],
  ordemservicofaturamento: [],
  ordemservicoitem: ['cancelado', 'contador'],
  ordemservicoitemlote: [],
  tipoordemservicoevento: ['status', 'ordem', 'ativo', 'padrao']
}

export function toIntegerOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'boolean') return value ? 1 : 0
  const n = typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'))
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

/** Converte campos inteiros in-place (evita "0.000000" em colunas integer). */
export function coerceIntegerColumns(
  row: Record<string, unknown>,
  table: string
): Record<string, unknown> {
  const cols = INTEGER_COLUMNS_BY_TABLE[table]
  if (!cols?.length) return row
  const out = { ...row }
  for (const col of cols) {
    if (!(col in out) || out[col] === null || out[col] === undefined) continue
    out[col] = toIntegerOrNull(out[col])
  }
  return out
}

/** Limites varchar do destino (allowlist) — evita "value too long for type character varying(N)" */
export const VARCHAR_LIMITS_BY_TABLE: Record<string, Record<string, number>> = {
  produtos: {
    ean: 14,
    descricao: 100,
    nome: 120,
    referencia: 60,
    unidademedida: 6,
    tipo: 1,
    tipoproduto: 2,
    ncm: 10,
    iat: 1,
    ippt: 1,
    cstipisaida: 3,
    situacaotributaria: 3,
    situacaotributariasn: 3,
    tributacaosn: 3,
    tributacao: 7,
    tributacaoespecial: 7,
    tributacaoespecialnfcesat: 3,
    numerofci: 36
  },
  entidade: {
    nome: 120,
    razaosocial: 120,
    cnpjcpf: 20,
    inscricaoestadual: 20,
    rg: 20,
    email: 200,
    telefone: 40,
    endereco: 120,
    numeroendereco: 20,
    complemento: 60,
    bairro: 60,
    cep: 9
  },
  planocontas: {
    codigo: 30,
    nome: 40,
    tipomovimento: 1,
    classe: 2
  },
  hierarquia: {
    codigo: 30,
    nome: 40,
    ncm: 10,
    tipoproduto: 2,
    tributacao: 7,
    tributacaoespecial: 7,
    tributacaosn: 3,
    iat: 1,
    ippt: 1,
    cstpis: 2,
    cstcofins: 2
  },
  notafiscal: {
    tipodocumento: 2,
    numeronotafiscal: 11,
    serie: 6,
    razaosocial: 60,
    cnpjcpf: 20,
    inscricaoestadual: 20,
    endereco: 60,
    numeroendereco: 6,
    bairro: 50,
    complemento: 50,
    cep: 9,
    telefone: 40,
    chavenfe: 44,
    modelo: 4
  },
  notafiscalitem: {
    tipo: 1,
    produto: 20,
    descricao: 120,
    unidade: 6,
    ncm: 11,
    cfop: 20,
    situacaotributaria: 3,
    situacaotributariasn: 3,
    tributacao: 7,
    observacao: 20
  },
  financeiro: {
    tipo: 1,
    documento: 60,
    nossonumero: 25
  },
  financeirolancamento: {
    usuario: 10
  },
  ordemservico: {
    nomecliente: 60,
    cnpjcpfcliente: 18,
    marca: 30,
    modelo: 30,
    placa: 10
  },
  ordemservicoevento: {
    nomecontato: 50
  },
  ordemservicoitem: {
    codigorproduto: 20,
    nomeproduto: 120,
    unidademedida: 6
  },
  ordemservicoitemlote: {
    codigolote: 30
  },
  tipoordemservicoevento: {
    codigo: 40,
    cor: 7,
    descricao: 100
  }
}

/** Chave NFe: 44 dígitos; origem costuma prefixar "NFe" / espaços. */
const CHAVE_NFE_COLUMNS = new Set(['chavenfe', 'chavedocumentoreferenciado'])

export function truncateVarchar(value: unknown, max: number): string | null {
  if (value === null || value === undefined) return null
  const text = stringifyPgText(value)
  if (!text) return null
  const chars = Array.from(text)
  return chars.length <= max ? text : chars.slice(0, max).join('')
}

export function stringifyPgText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return value.toString('utf8')
  }
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

export function normalizeChaveNfe(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const digits = stringifyPgText(value).replace(/\D/g, '')
  if (!digits) return null
  return digits.length <= 44 ? digits : digits.slice(0, 44)
}

export function lowercaseRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    out[key.toLowerCase()] = value
  }
  return out
}

function applyKnownLimit(table: string, col: string, value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (CHAVE_NFE_COLUMNS.has(col) || col.includes('chavenfe')) {
    return normalizeChaveNfe(value)
  }
  const max = VARCHAR_LIMITS_BY_TABLE[table]?.[col]
  if (max == null) return value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  return truncateVarchar(value, max)
}

export function coerceVarcharColumns(
  row: Record<string, unknown>,
  table: string
): Record<string, unknown> {
  const out = lowercaseRowKeys(row)
  const limits = VARCHAR_LIMITS_BY_TABLE[table]
  const keys = new Set([
    ...Object.keys(out),
    ...Object.keys(limits ?? {}),
    ...CHAVE_NFE_COLUMNS
  ])
  for (const col of keys) {
    if (!(col in out) || out[col] === null || out[col] === undefined) continue
    out[col] = applyKnownLimit(table, col, out[col])
  }
  return out
}

/**
 * Se o Postgres recusar varchar(N), corta o primeiro valor string maior que N.
 * Cobre divergência de schema em produção (ex.: razaosocial varchar(44)).
 */
export function truncateOverflowingValue(
  columns: string[],
  values: unknown[],
  max: number
): { column: string; before: number } | null {
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    if (value === null || value === undefined) continue
    if (typeof value === 'number' || typeof value === 'boolean') continue
    const text = stringifyPgText(value)
    const len = Array.from(text).length
    if (len > max) {
      const col = columns[i]
      values[i] = CHAVE_NFE_COLUMNS.has(col) || col.includes('chavenfe')
        ? normalizeChaveNfe(value)
        : truncateVarchar(value, max)
      return { column: col, before: len }
    }
  }
  return null
}

export function varcharTooLongMax(message: string): number | null {
  const match = message.match(/character varying\((\d+)\)/i)
  if (!match) return null
  const max = Number(match[1])
  return Number.isFinite(max) ? max : null
}

/**
 * FKs → entidade que podem apontar para registros não migrados / rejeitados.
 * Anuladas no import se o UUID não existir no destino (evita fk_notafiscal_representante).
 */
export const OPTIONAL_ENTIDADE_FKS: Partial<Record<EntityKind, readonly string[]>> = {
  nota_fiscal: ['identidade', 'idtransportadora', 'idrepresentante', 'idrepresentante2'],
  financeiro: ['identidade', 'idrepresentante', 'idrepresentante2'],
  produto: ['fornecedor'],
  ordem_servico: ['idcliente']
}

/** FKs → hierarquia (ex.: produto.idgrupo) */
export const OPTIONAL_HIERARQUIA_FKS: Partial<Record<EntityKind, readonly string[]>> = {
  produto: ['idgrupo']
}

/** FKs → planocontas (conta analítica associada ou conta pai). */
export const OPTIONAL_PLANO_CONTAS_FKS: Partial<Record<EntityKind, readonly string[]>> = {
  plano_contas: ['idplanocontas'],
  entidade: ['idplanocontas'],
  produto: ['idplanocontas'],
  nota_fiscal: ['idplanocontas'],
  financeiro: ['idplanocontas']
}

/** Tabelas que existem no schema Mais Gestão e podem receber UPSERT. */
export const MAIS_GESTAO_IMPORT_TABLES = new Set(
  Object.values(KIND_TO_TABLE).filter((t): t is string => Boolean(t))
)

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Normaliza FK (número UniPlus, string, etc.) → UUID válido ou null. */
export function coerceFkId(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return null
  const text = String(value).trim()
  if (!text || text === 'null' || text === 'undefined') return null
  if (!UUID_RE.test(text)) return null
  return text.toLowerCase()
}

/** Campo FK → kind usado no UUID v5 da migração UniPlus. */
const SCOPED_FK_KIND: Record<string, string> = {
  idnotafiscal: 'nota_fiscal',
  idfinanceiro: 'financeiro',
  idordemservico: 'ordem_servico',
  idordemservicoitem: 'ordem_servico_item',
  idproduto: 'produto',
  idprodutokit: 'produto',
  identidade: 'entidade',
  idtransportadora: 'entidade',
  idrepresentante: 'entidade',
  idrepresentante2: 'entidade',
  idcliente: 'entidade',
  fornecedor: 'entidade',
  idgrupo: 'hierarquia',
  idplanocontas: 'plano_contas',
  idorigem: 'nota_fiscal',
  iddocumentofiscal: 'nota_fiscal',
  idfaturamento: 'financeiro'
}

/**
 * UUID já migrado, ou ID numérico UniPlus → UUID v5 do destino.
 */
export function resolveScopedFk(field: string, value: unknown): string | null {
  const uuid = coerceFkId(value)
  if (uuid) return uuid
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'boolean') return null
  const raw = String(value).trim()
  if (!raw || raw === '0' || raw === 'null' || raw === 'undefined') return null
  const kind = SCOPED_FK_KIND[field]
  if (!kind) return null
  return destinationId(kind, raw, 'uniplus')
}

export function collectFkIds(
  rows: Record<string, unknown>[],
  fields: readonly string[]
): string[] {
  const ids = new Set<string>()
  for (const row of rows) {
    for (const field of fields) {
      const id = resolveScopedFk(field, row[field])
      if (id) {
        row[field] = id
        ids.add(id)
      }
    }
  }
  return [...ids]
}

/**
 * Anula FKs inválidas (não-UUID / ausentes no destino). Mutates row.
 * Retorna campos anulados.
 */
export function nullMissingFks(
  row: Record<string, unknown>,
  fields: readonly string[],
  existing: Set<string>
): string[] {
  const nulled: string[] = []
  for (const field of fields) {
    if (!(field in row) || row[field] === null || row[field] === undefined) continue
    const id = resolveScopedFk(field, row[field])
    if (!id || !existing.has(id)) {
      row[field] = null
      nulled.push(field)
    } else {
      row[field] = id
    }
  }
  return nulled
}

export function buildUpsertSql(table: string, columns: string[]): string {
  const cols = columns.join(', ')
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
  const skipUpdate = new Set(['id', 'datacadastro', 'criadoem', 'datacriacao'])
  const updates = columns
    .filter((c) => !skipUpdate.has(c))
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(',\n  ')
  return `INSERT INTO ${table} (${cols}) VALUES (${placeholders})
ON CONFLICT (id) DO UPDATE SET
  ${updates}`
}

export function pickColumns(
  row: Record<string, unknown>,
  allowed: string[],
  idempresa: string,
  table = ''
): { columns: string[]; values: unknown[] } {
  const withEmpresa: Record<string, unknown> = { ...lowercaseRowKeys(row), idempresa }
  const now = new Date().toISOString()
  if (allowed.includes('criadoem') && withEmpresa.criadoem == null) {
    withEmpresa.criadoem = now
  }
  if (allowed.includes('atualizadoem')) {
    withEmpresa.atualizadoem = now
  }
  if (allowed.includes('datacadastro') && withEmpresa.datacadastro == null) {
    withEmpresa.datacadastro = now
  }
  if (allowed.includes('datacriacao') && withEmpresa.datacriacao == null) {
    withEmpresa.datacriacao = now
  }
  if (allowed.includes('dataalteracao')) {
    withEmpresa.dataalteracao = now
  }

  const columns: string[] = []
  const values: unknown[] = []
  for (const col of allowed) {
    if (col === 'idempresa') {
      columns.push(col)
      values.push(idempresa)
      continue
    }
    if (!(col in withEmpresa) && col !== 'id') continue
    if (col === 'id' && withEmpresa.id == null) continue
    columns.push(col)
    let value = applyKnownLimit(table, col, withEmpresa[col])
    if (value instanceof Date) {
      value = value.toISOString()
    }
    values.push(value === undefined ? null : value)
  }
  return { columns, values }
}
