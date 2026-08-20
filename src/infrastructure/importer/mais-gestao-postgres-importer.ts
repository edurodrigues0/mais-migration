import pg from 'pg'
import type { CanonicalEntity, Cliente, EntityKind, Produto, TaxaUf } from '@domain/canonical/types'
import type { DestinoConfig } from '@config/destino-ini'
import { destinoLabel } from '@config/destino-ini'
import type { Logger } from '@infrastructure/logging/logger'
import {
  mapClienteToEntidade,
  mapProdutoToProdutos,
  mapTaxaUfToRow,
  destinationClienteId,
  destinationProdutoId,
  destinationTaxaUfId,
  destinationId,
  type EntidadeRow,
  type ProdutoRow,
  type TaxaUfRow
} from '@infrastructure/importer/mais-gestao-mappers'
import {
  KIND_TO_TABLE,
  MAIS_GESTAO_IMPORT_TABLES,
  UNIPLUS_IMPORT_ORDER,
  UNIPLUS_ROLLBACK_ORDER,
  UNIPLUS_TABLE_COLUMNS,
  OPTIONAL_ENTIDADE_FKS,
  OPTIONAL_HIERARQUIA_FKS,
  OPTIONAL_PRODUTO_FKS,
  OPTIONAL_NOTA_FKS,
  OPTIONAL_FINANCEIRO_FKS,
  OPTIONAL_PLANO_CONTAS_FKS,
  REQUIRED_PARENT_FKS,
  buildUpsertSql,
  coerceIntegerColumns,
  coerceVarcharColumns,
  collectFkIds,
  lowercaseRowKeys,
  nullMissingFks,
  pickColumns,
  resolveScopedFk,
  truncateOverflowingValue,
  varcharTooLongMax
} from '@infrastructure/importer/uniplus-import-columns'
import type {
  DestinationImporter,
  ImportOptions,
  ImportResult,
  RollbackResult
} from '@infrastructure/importer/types'
import {
  indexTaxaUfRows,
  normalizeTaxaUfCodigo,
  padCestDigits,
  pickPreferredCestId,
  pickTaxaUfId,
  taxCodeDigits,
  uniqueTaxCodes
} from '@infrastructure/importer/tax-code'
import type { DestinoEmpresa } from '@shared/ipc'
import {
  errorMessage,
  isConnectionError,
  wrapConnectionError
} from '@infrastructure/db/pg-errors'
import {
  planoContasCodigoDepth,
  resolvePlanoContasParentUpdates
} from '@infrastructure/importer/plano-contas-hierarchy'

const { Pool } = pg

const BATCH_SIZE = 200

function isForeignKeyViolation(error: unknown, message: string): boolean {
  if (/violates foreign key constraint/i.test(message)) return true
  const code = (error as { code?: string }).code
  if (code === '23503') return true
  const cause = (error as { cause?: unknown }).cause
  if (cause && cause !== error) {
    const nested = cause instanceof Error ? cause.message : String(cause)
    return isForeignKeyViolation(cause, nested)
  }
  return false
}

function planoContasEntityCodigo(entity: CanonicalEntity): string {
  const columns = (entity.payload as { columns?: Record<string, unknown> }).columns
  return String(columns?.codigo ?? '')
}

/** Pais (código mais curto) antes dos filhos, para a FK idplanocontas existir no insert. */
function sortPlanoContasForInsert(entities: CanonicalEntity[]): CanonicalEntity[] {
  return [...entities].sort((a, b) => {
    const codigoA = planoContasEntityCodigo(a)
    const codigoB = planoContasEntityCodigo(b)
    const depth = planoContasCodigoDepth(codigoA) - planoContasCodigoDepth(codigoB)
    if (depth !== 0) return depth
    return codigoA.localeCompare(codigoB, 'pt-BR')
  })
}

const UPSERT_ENTIDADE = `
INSERT INTO entidade (
  id, nome, razaosocial, tipopessoa, cnpjcpf, rg, nascimento, email, telefone,
  endereco, numeroendereco, complemento, bairro, cep,
  cliente, fornecedor, transportador, representante,
  idempresa, criadoem, atualizadoem
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,
  $10,$11,$12,$13,$14,
  $15,$16,$17,$18,
  $19,$20,$21
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  razaosocial = EXCLUDED.razaosocial,
  tipopessoa = EXCLUDED.tipopessoa,
  cnpjcpf = EXCLUDED.cnpjcpf,
  rg = EXCLUDED.rg,
  nascimento = EXCLUDED.nascimento,
  email = EXCLUDED.email,
  telefone = EXCLUDED.telefone,
  endereco = EXCLUDED.endereco,
  numeroendereco = EXCLUDED.numeroendereco,
  complemento = EXCLUDED.complemento,
  bairro = EXCLUDED.bairro,
  cep = EXCLUDED.cep,
  cliente = EXCLUDED.cliente,
  fornecedor = EXCLUDED.fornecedor,
  transportador = EXCLUDED.transportador,
  representante = EXCLUDED.representante,
  idempresa = EXCLUDED.idempresa,
  atualizadoem = EXCLUDED.atualizadoem
`

const UPSERT_PRODUTO = `
INSERT INTO produtos (
  id, idempresa, descricao, nome, codigo, referencia, preco,
  unidademedida, tipo, tipoproduto, inativo, datacadastro,
  ean, ncm, iat, ippt, ipi, ipientrada, percentualipisaida, cstipisaida, cstipientrada,
  situacaotributaria, situacaotributariasn, situacaotributariasnentrada, tributacaosn, tributacaoespecialnfcesat,
  cest, numerofci, peso, customedioinicial, quantidademinima,
  dataultimacompra, valoripiultimanota, observacoes,
  cstpis, cstpisentrada, cstcofins, cstcofinsentrada,
  aliquotapis, aliquotacofins, aliquotapisentrada, aliquotaconfinsentrada,
  idcest, idcfopsaida, idtaxauf
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,
  $8,$9,$10,$11,$12,
  $13,$14,$15,$16,$17,$18,$19,$20,$21,
  $22,$23,$24,$25,$26,
  $27,$28,$29,$30,$31,
  $32,$33,$34,
  $35,$36,$37,$38,
  $39,$40,$41,$42,
  $43,$44,$45
)
ON CONFLICT (id) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  nome = EXCLUDED.nome,
  codigo = EXCLUDED.codigo,
  referencia = EXCLUDED.referencia,
  preco = EXCLUDED.preco,
  unidademedida = EXCLUDED.unidademedida,
  idempresa = EXCLUDED.idempresa,
  inativo = EXCLUDED.inativo,
  ean = EXCLUDED.ean,
  ncm = EXCLUDED.ncm,
  iat = EXCLUDED.iat,
  ippt = EXCLUDED.ippt,
  ipi = EXCLUDED.ipi,
  ipientrada = EXCLUDED.ipientrada,
  percentualipisaida = EXCLUDED.percentualipisaida,
  cstipisaida = EXCLUDED.cstipisaida,
  cstipientrada = EXCLUDED.cstipientrada,
  situacaotributaria = EXCLUDED.situacaotributaria,
  situacaotributariasn = EXCLUDED.situacaotributariasn,
  situacaotributariasnentrada = EXCLUDED.situacaotributariasnentrada,
  tributacaosn = EXCLUDED.tributacaosn,
  tributacaoespecialnfcesat = EXCLUDED.tributacaoespecialnfcesat,
  cest = EXCLUDED.cest,
  numerofci = EXCLUDED.numerofci,
  peso = EXCLUDED.peso,
  customedioinicial = EXCLUDED.customedioinicial,
  quantidademinima = EXCLUDED.quantidademinima,
  dataultimacompra = EXCLUDED.dataultimacompra,
  valoripiultimanota = EXCLUDED.valoripiultimanota,
  observacoes = EXCLUDED.observacoes,
  cstpis = EXCLUDED.cstpis,
  cstpisentrada = EXCLUDED.cstpisentrada,
  cstcofins = EXCLUDED.cstcofins,
  cstcofinsentrada = EXCLUDED.cstcofinsentrada,
  aliquotapis = EXCLUDED.aliquotapis,
  aliquotacofins = EXCLUDED.aliquotacofins,
  aliquotapisentrada = EXCLUDED.aliquotapisentrada,
  aliquotaconfinsentrada = EXCLUDED.aliquotaconfinsentrada,
  idcest = EXCLUDED.idcest,
  idcfopsaida = EXCLUDED.idcfopsaida,
  idtaxauf = EXCLUDED.idtaxauf
`

const UPSERT_TAXAUF = `
INSERT INTO taxauf (
  id, idempresa, codigo, descricao,
  baseicms, baseicmsfe, baseicmsst,
  uf_ac, uf_al, uf_am, uf_ap, uf_ba, uf_ce, uf_df, uf_es, uf_go,
  uf_ma, uf_mg, uf_ms, uf_mt, uf_pa, uf_pb, uf_pe, uf_pi, uf_pr,
  uf_rj, uf_rn, uf_ro, uf_rr, uf_rs, uf_sc, uf_se, uf_sp, uf_to,
  baseiss, iss, pordif, bcporuf, inativo
) VALUES (
  $1,$2,$3,$4,
  $5,$6,$7,
  $8,$9,$10,$11,$12,$13,$14,$15,$16,
  $17,$18,$19,$20,$21,$22,$23,$24,$25,
  $26,$27,$28,$29,$30,$31,$32,$33,$34,
  $35,$36,$37,$38,$39
)
ON CONFLICT (idempresa, codigo) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  baseicms = EXCLUDED.baseicms,
  baseicmsfe = EXCLUDED.baseicmsfe,
  baseicmsst = EXCLUDED.baseicmsst,
  uf_ac = EXCLUDED.uf_ac, uf_al = EXCLUDED.uf_al, uf_am = EXCLUDED.uf_am,
  uf_ap = EXCLUDED.uf_ap, uf_ba = EXCLUDED.uf_ba, uf_ce = EXCLUDED.uf_ce,
  uf_df = EXCLUDED.uf_df, uf_es = EXCLUDED.uf_es, uf_go = EXCLUDED.uf_go,
  uf_ma = EXCLUDED.uf_ma, uf_mg = EXCLUDED.uf_mg, uf_ms = EXCLUDED.uf_ms,
  uf_mt = EXCLUDED.uf_mt, uf_pa = EXCLUDED.uf_pa, uf_pb = EXCLUDED.uf_pb,
  uf_pe = EXCLUDED.uf_pe, uf_pi = EXCLUDED.uf_pi, uf_pr = EXCLUDED.uf_pr,
  uf_rj = EXCLUDED.uf_rj, uf_rn = EXCLUDED.uf_rn, uf_ro = EXCLUDED.uf_ro,
  uf_rr = EXCLUDED.uf_rr, uf_rs = EXCLUDED.uf_rs, uf_sc = EXCLUDED.uf_sc,
  uf_se = EXCLUDED.uf_se, uf_sp = EXCLUDED.uf_sp, uf_to = EXCLUDED.uf_to,
  baseiss = EXCLUDED.baseiss,
  iss = EXCLUDED.iss,
  pordif = EXCLUDED.pordif,
  bcporuf = EXCLUDED.bcporuf,
  inativo = EXCLUDED.inativo
`

export { UPSERT_PRODUTO as MAIS_GESTAO_UPSERT_PRODUTO, UPSERT_TAXAUF as MAIS_GESTAO_UPSERT_TAXAUF }

function isUniplusColumnsPayload(
  payload: unknown
): payload is { columns: Record<string, unknown> } {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'columns' in payload &&
      (payload as { columns: unknown }).columns &&
      typeof (payload as { columns: unknown }).columns === 'object'
  )
}

export class MaisGestaoPostgresImporter implements DestinationImporter {
  private readonly pool: pg.Pool
  /** Evita apagar o plano de contas duas vezes no mesmo job (2ª passagem dos pais). */
  private readonly replacedPlanoContas = new Set<string>()

  constructor(
    private readonly config: DestinoConfig,
    private readonly logger: Logger
  ) {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 20_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5_000
    })
    this.pool.on('error', (error) => {
      this.logger.warn({ err: error }, 'Postgres pool: cliente ocioso desconectou')
    })
  }

  getDestinationLabel(): string {
    return destinoLabel(this.config)
  }

  async ping(): Promise<void> {
    await this.withClient((client) => client.query('SELECT 1'))
  }

  async listEmpresas(): Promise<DestinoEmpresa[]> {
    return this.withClient(async (client) => {
      const result = await client.query<{ id: string; nome: string; cnpj: string }>(
        `SELECT id, nome, cnpj
         FROM empresas
         ORDER BY nome ASC`
      )
      return result.rows.map((row) => ({
        id: row.id,
        nome: row.nome,
        cnpj: row.cnpj
      }))
    })
  }

  async validateEmpresa(idempresa: string): Promise<void> {
    if (!idempresa?.trim()) {
      throw new Error('Selecione a empresa de destino no wizard')
    }
    await this.withClient(async (client) => {
      const result = await client.query<{ id: string }>(
        'SELECT id FROM empresas WHERE id = $1 LIMIT 1',
        [idempresa.trim()]
      )
      if (result.rowCount === 0) {
        throw new Error(`Empresa não encontrada no Postgres: idempresa=${idempresa}`)
      }
    })
  }

  async importAll(
    jobId: string,
    entities: CanonicalEntity[],
    options: ImportOptions
  ): Promise<ImportResult> {
    const idempresa = options.idempresa?.trim()
    if (!idempresa) {
      throw new Error('idempresa é obrigatório para importar no Mais Gestão')
    }
    await this.validateEmpresa(idempresa)

    const hasUniplus = entities.some((e) => e.sourceSystem === 'uniplus')
    if (hasUniplus) {
      return this.importUniplus(jobId, entities, idempresa)
    }
    return this.importClippLike(jobId, entities, idempresa)
  }

  private async importClippLike(
    jobId: string,
    entities: CanonicalEntity[],
    idempresa: string
  ): Promise<ImportResult> {
    const byKind: Record<string, number> = {}
    const warnings: string[] = []
    const clientes: EntidadeRow[] = []
    const taxasUf: TaxaUfRow[] = []
    const produtos: ProdutoRow[] = []
    const produtoTax: Array<{
      row: ProdutoRow
      cestCodigo?: string
      cfopSaida?: string
      taxaUfCodigo?: string
      externalId: string
    }> = []

    for (const entity of entities) {
      if (entity.kind === 'cliente') {
        const row = mapClienteToEntidade(entity as CanonicalEntity<Cliente>, idempresa)
        if (row.warning) warnings.push(`${row.id}: ${row.warning}`)
        clientes.push(row)
      } else if (entity.kind === 'taxa_uf') {
        taxasUf.push(mapTaxaUfToRow(entity as CanonicalEntity<TaxaUf>, idempresa))
      } else if (entity.kind === 'produto') {
        const product = entity as CanonicalEntity<Produto>
        const row = mapProdutoToProdutos(product, idempresa)
        if (row.warning) warnings.push(`${row.id}: ${row.warning}`)
        produtos.push(row)
        produtoTax.push({
          row,
          cestCodigo: product.payload.cestCodigo,
          cfopSaida: product.payload.cfopSaida,
          taxaUfCodigo: product.payload.taxaUfCodigo,
          externalId: entity.externalId
        })
      } else {
        warnings.push(`Tipo ignorado no destino MAIS: ${entity.kind}/${entity.externalId}`)
      }
    }

    const client = await this.pool.connect()
    try {
      await this.insertBatches(client, clientes, async (row) => {
        await client.query(UPSERT_ENTIDADE, [
          row.id,
          row.nome,
          row.razaosocial,
          row.tipopessoa,
          row.cnpjcpf,
          row.rg,
          row.nascimento,
          row.email,
          row.telefone,
          row.endereco,
          row.numeroendereco,
          row.complemento,
          row.bairro,
          row.cep,
          row.cliente,
          row.fornecedor,
          row.transportador,
          row.representante,
          row.idempresa,
          row.criadoem,
          row.atualizadoem
        ])
      })
      byKind.cliente = clientes.length

      await this.insertBatches(client, taxasUf, async (row) => {
        await client.query(UPSERT_TAXAUF, [
          row.id,
          row.idempresa,
          row.codigo,
          row.descricao,
          row.baseicms,
          row.baseicmsfe,
          row.baseicmsst,
          row.uf_ac,
          row.uf_al,
          row.uf_am,
          row.uf_ap,
          row.uf_ba,
          row.uf_ce,
          row.uf_df,
          row.uf_es,
          row.uf_go,
          row.uf_ma,
          row.uf_mg,
          row.uf_ms,
          row.uf_mt,
          row.uf_pa,
          row.uf_pb,
          row.uf_pe,
          row.uf_pi,
          row.uf_pr,
          row.uf_rj,
          row.uf_rn,
          row.uf_ro,
          row.uf_rr,
          row.uf_rs,
          row.uf_sc,
          row.uf_se,
          row.uf_sp,
          row.uf_to,
          row.baseiss,
          row.iss,
          row.pordif,
          row.bcporuf,
          row.inativo
        ])
      })
      byKind.taxa_uf = taxasUf.length

      await this.resolveClippTaxFks(client, idempresa, produtoTax, warnings, taxasUf)

      await this.insertBatches(client, produtos, async (row) => {
        await client.query(UPSERT_PRODUTO, [
          row.id,
          row.idempresa,
          row.descricao,
          row.nome,
          row.codigo,
          row.referencia,
          row.preco,
          row.unidademedida,
          row.tipo,
          row.tipoproduto,
          row.inativo,
          row.datacadastro,
          row.ean,
          row.ncm,
          row.iat,
          row.ippt,
          row.ipi,
          row.ipientrada,
          row.percentualipisaida,
          row.cstipisaida,
          row.cstipientrada,
          row.situacaotributaria,
          row.situacaotributariasn,
          row.situacaotributariasnentrada,
          row.tributacaosn,
          row.tributacaoespecialnfcesat,
          row.cest,
          row.numerofci,
          row.peso,
          row.customedioinicial,
          row.quantidademinima,
          row.dataultimacompra,
          row.valoripiultimanota,
          row.observacoes,
          row.cstpis,
          row.cstpisentrada,
          row.cstcofins,
          row.cstcofinsentrada,
          row.aliquotapis,
          row.aliquotacofins,
          row.aliquotapisentrada,
          row.aliquotaconfinsentrada,
          row.idcest,
          row.idcfopsaida,
          row.idtaxauf
        ])
      })
      byKind.produto = produtos.length
    } finally {
      client.release()
    }

    const imported = clientes.length + taxasUf.length + produtos.length
    this.logger.info(
      { jobId, imported, byKind, idempresa, destination: this.getDestinationLabel() },
      'Mais Gestão import completed'
    )

    return {
      imported,
      byKind,
      warnings: warnings.slice(0, 50),
      destination: `${this.getDestinationLabel()} / empresa ${idempresa}`
    }
  }

  private async resolveClippTaxFks(
    client: pg.PoolClient,
    idempresa: string,
    items: Array<{
      row: ProdutoRow
      cestCodigo?: string
      cfopSaida?: string
      taxaUfCodigo?: string
      externalId: string
    }>,
    warnings: string[],
    taxasUf: TaxaUfRow[]
  ): Promise<void> {
    if (items.length === 0) return

    const cestCodes = uniqueTaxCodes(items.map((item) => padCestDigits(taxCodeDigits(item.cestCodigo))))
    const cfopCodes = uniqueTaxCodes(items.map((item) => item.cfopSaida))

    const cestByDigits = new Map<string, string>()
    if (cestCodes.length > 0) {
      const result = await client.query<{ id: string; digits: string; idempresa: string | null }>(
        `SELECT id,
                regexp_replace(codigo, '\\D', '', 'g') AS digits,
                idempresa
         FROM cest
         WHERE regexp_replace(codigo, '\\D', '', 'g') = ANY($1::text[])
           AND (idempresa = $2 OR idempresa IS NULL)`,
        [cestCodes, idempresa]
      )
      for (const [digits, id] of pickPreferredCestId(result.rows, idempresa)) {
        cestByDigits.set(digits, id)
      }
    }

    const cfopByDigits = new Map<string, string>()
    if (cfopCodes.length > 0) {
      const result = await client.query<{ id: string; digits: string }>(
        `SELECT id, regexp_replace(codigo, '\\D', '', 'g') AS digits
         FROM cfop
         WHERE regexp_replace(codigo, '\\D', '', 'g') = ANY($1::text[])
           AND idempresa = $2`,
        [cfopCodes, idempresa]
      )
      for (const row of result.rows) {
        if (!cfopByDigits.has(row.digits)) cfopByDigits.set(row.digits, row.id)
      }
    }

    const { byCodigo: taxaByCodigo, ids: taxaIds } = await this.loadTaxaUfIndex(
      client,
      idempresa,
      taxasUf
    )

    for (const item of items) {
      const cestDigits = padCestDigits(taxCodeDigits(item.cestCodigo))
      if (cestDigits) {
        const id = cestByDigits.get(cestDigits)
        if (id) {
          item.row.idcest = id
        } else {
          warnings.push(
            `produto/${item.externalId}: CEST ${cestDigits} não encontrado no destino; idcest nulo`
          )
        }
      }

      const cfopDigits = taxCodeDigits(item.cfopSaida)
      if (cfopDigits) {
        const id = cfopByDigits.get(cfopDigits)
        if (id) {
          item.row.idcfopsaida = id
        } else {
          warnings.push(
            `produto/${item.externalId}: CFOP ${cfopDigits} não encontrado no destino; idcfopsaida nulo`
          )
        }
      }

      const taxaCodigo = normalizeTaxaUfCodigo(item.taxaUfCodigo)
      if (taxaCodigo) {
        const fallbackId = destinationTaxaUfId(taxaCodigo, 'clipp')
        const id = pickTaxaUfId(taxaCodigo, taxaByCodigo, taxaIds, fallbackId)
        if (id) {
          item.row.idtaxauf = id
        } else {
          warnings.push(
            `produto/${item.externalId}: taxa UF ${taxaCodigo} não encontrada no destino; idtaxauf nulo`
          )
        }
      }
    }
  }

  private async loadTaxaUfIndex(
    client: pg.PoolClient,
    idempresa: string,
    taxasUf: TaxaUfRow[]
  ): Promise<{ byCodigo: Map<string, string>; ids: Set<string> }> {
    const seeded = indexTaxaUfRows(taxasUf)
    try {
      const result = await client.query<{ id: string; codigo: string }>(
        `SELECT id, codigo FROM taxauf WHERE idempresa = $1`,
        [idempresa]
      )
      const dest = indexTaxaUfRows(result.rows)
      for (const [codigo, id] of dest.byCodigo) {
        seeded.byCodigo.set(codigo, id)
      }
      for (const id of dest.ids) seeded.ids.add(id)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!/taxauf|does not exist/i.test(message)) throw error
    }
    return seeded
  }

  private async importUniplus(
    jobId: string,
    entities: CanonicalEntity[],
    idempresa: string
  ): Promise<ImportResult> {
    const byKind: Record<string, number> = {}
    const warnings: string[] = []
    const byKindEntities = new Map<EntityKind, CanonicalEntity[]>()

    for (const entity of entities) {
      if (entity.sourceSystem !== 'uniplus') {
        warnings.push(`Ignorado (não UniPlus): ${entity.kind}/${entity.externalId}`)
        continue
      }
      if (!isUniplusColumnsPayload(entity.payload)) {
        warnings.push(`Payload inválido UniPlus: ${entity.kind}/${entity.externalId}`)
        continue
      }
      const list = byKindEntities.get(entity.kind) ?? []
      list.push(entity)
      byKindEntities.set(entity.kind, list)
      for (const w of entity.warnings) {
        warnings.push(`${entity.kind}/${entity.externalId}: ${w}`)
      }
    }

    await this.withClientRetry((client) => this.ensureDefaultTipoOsEvento(client, idempresa))

    if (byKindEntities.has('plano_contas')) {
      const wipeKey = `${jobId}:${idempresa}`
      if (!this.replacedPlanoContas.has(wipeKey)) {
        await this.withClientRetry((client) => this.replaceCompanyPlanoContas(client, idempresa))
        this.replacedPlanoContas.add(wipeKey)
      }
    }

    for (const kind of UNIPLUS_IMPORT_ORDER) {
      let list = byKindEntities.get(kind) ?? []
      if (list.length === 0) {
        byKind[kind] = 0
        continue
      }
      if (kind === 'plano_contas') {
        list = sortPlanoContasForInsert(list)
      }
      const table = KIND_TO_TABLE[kind]
      if (!table || !MAIS_GESTAO_IMPORT_TABLES.has(table)) {
        if (list.length > 0) {
          warnings.push(`Tipo ignorado (tabela ausente no Mais Gestão): ${kind}`)
        }
        continue
      }
      const allowed = UNIPLUS_TABLE_COLUMNS[table]
      if (!allowed) continue

      const entidadeFks = OPTIONAL_ENTIDADE_FKS[kind] ?? []
      const hierarquiaFks = OPTIONAL_HIERARQUIA_FKS[kind] ?? []
      const produtoFks = OPTIONAL_PRODUTO_FKS[kind] ?? []
      const notaFks = OPTIONAL_NOTA_FKS[kind] ?? []
      const financeiroFks = OPTIONAL_FINANCEIRO_FKS[kind] ?? []
      const planoContasFks = OPTIONAL_PLANO_CONTAS_FKS[kind] ?? []
      const requiredParent = REQUIRED_PARENT_FKS[kind]

      let inserted = 0

      for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const batch = list.slice(i, i + BATCH_SIZE)
        const preparedBatch: { entity: CanonicalEntity; row: Record<string, unknown> }[] = []

        for (const entity of batch) {
          const columnsPayload = (entity.payload as { columns: Record<string, unknown> }).columns
          let prepared = lowercaseRowKeys(columnsPayload)
          if (
            kind === 'financeiro_lancamento' &&
            (prepared.evento === null || prepared.evento === undefined)
          ) {
            prepared.evento = 0
          }
          prepared = coerceIntegerColumns(prepared, table)
          prepared = coerceVarcharColumns(prepared, table)
          preparedBatch.push({ entity, row: prepared })
        }

        inserted += await this.withClientRetry((client) =>
          this.flushUniplusBatch(client, {
            kind,
            table,
            allowed,
            idempresa,
            preparedBatch,
            entidadeFks,
            hierarquiaFks,
            produtoFks,
            notaFks,
            financeiroFks,
            planoContasFks,
            requiredParent,
            warnings
          })
        )
      }
      byKind[kind] = inserted
    }

    if (byKindEntities.has('plano_contas')) {
      await this.withClientRetry((client) => this.relinkPlanoContasParents(client, idempresa))
    }

    const imported = Object.values(byKind).reduce((a, b) => a + b, 0)
    this.logger.info(
      { jobId, imported, byKind, idempresa, destination: this.getDestinationLabel() },
      'Mais Gestão UniPlus import completed'
    )

    return {
      imported,
      byKind,
      warnings: warnings.slice(0, 80),
      destination: `${this.getDestinationLabel()} / empresa ${idempresa}`
    }
  }

  private async ensureDefaultTipoOsEvento(client: pg.PoolClient, idempresa: string): Promise<void> {
    const id = destinationId('tipo_os_evento', 'default', 'uniplus')
    const now = new Date().toISOString()
    await client.query(
      `INSERT INTO tipoordemservicoevento (
         id, idempresa, codigo, status, cor, descricao, ordem, ativo, padrao, datacriacao, dataalteracao
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         descricao = EXCLUDED.descricao,
         dataalteracao = EXCLUDED.dataalteracao`,
      [id, idempresa, 'MIG-UNIPLUS', 1, '#64748B', 'Migrado UniPlus', 0, 1, 1, now, now]
    )
  }

  async rollback(jobId: string, entities: CanonicalEntity[]): Promise<RollbackResult> {
    const hasUniplus = entities.some((e) => e.sourceSystem === 'uniplus')
    if (hasUniplus) {
      return this.rollbackUniplus(jobId, entities)
    }

    const clienteIds: string[] = []
    const produtoIds: string[] = []
    const taxaUfIds: string[] = []
    const byKind: Record<string, number> = {}

    for (const entity of entities) {
      if (entity.kind === 'cliente') {
        clienteIds.push(destinationClienteId(entity.externalId, entity.sourceSystem))
      } else if (entity.kind === 'produto') {
        produtoIds.push(destinationProdutoId(entity.externalId, entity.sourceSystem))
      } else if (entity.kind === 'taxa_uf') {
        taxaUfIds.push(destinationTaxaUfId(entity.externalId, entity.sourceSystem))
      }
    }

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      let deletedProdutos = 0
      let deletedClientes = 0
      let deletedTaxas = 0

      if (produtoIds.length > 0) {
        const result = await client.query(`DELETE FROM produtos WHERE id = ANY($1::text[])`, [
          produtoIds
        ])
        deletedProdutos = result.rowCount ?? 0
      }

      if (taxaUfIds.length > 0) {
        const result = await client.query(`DELETE FROM taxauf WHERE id = ANY($1::text[])`, [
          taxaUfIds
        ])
        deletedTaxas = result.rowCount ?? 0
      }

      if (clienteIds.length > 0) {
        const result = await client.query(`DELETE FROM entidade WHERE id = ANY($1::text[])`, [
          clienteIds
        ])
        deletedClientes = result.rowCount ?? 0
      }

      await client.query('COMMIT')
      byKind.produto = deletedProdutos
      byKind.cliente = deletedClientes
      byKind.taxa_uf = deletedTaxas

      const deleted = deletedProdutos + deletedClientes + deletedTaxas
      this.logger.info({ jobId, deleted, byKind }, 'Mais Gestão rollback completed')
      return { deleted, byKind }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private async rollbackUniplus(
    jobId: string,
    entities: CanonicalEntity[]
  ): Promise<RollbackResult> {
    const byKind: Record<string, number> = {}
    const idsByKind = new Map<EntityKind, string[]>()

    for (const entity of entities) {
      if (entity.sourceSystem !== 'uniplus') continue
      const id = destinationId(entity.kind, entity.externalId, 'uniplus')
      const list = idsByKind.get(entity.kind) ?? []
      list.push(id)
      idsByKind.set(entity.kind, list)
    }

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      for (const kind of UNIPLUS_ROLLBACK_ORDER) {
        const ids = idsByKind.get(kind) ?? []
        const table = KIND_TO_TABLE[kind]
        if (!table || ids.length === 0) {
          byKind[kind] = 0
          continue
        }
        const result = await client.query(`DELETE FROM ${table} WHERE id = ANY($1::text[])`, [ids])
        byKind[kind] = result.rowCount ?? 0
      }
      await client.query('COMMIT')
      const deleted = Object.values(byKind).reduce((a, b) => a + b, 0)
      this.logger.info({ jobId, deleted, byKind }, 'Mais Gestão UniPlus rollback completed')
      return { deleted, byKind }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private async flushUniplusBatch(
    client: pg.PoolClient,
    args: {
      kind: EntityKind
      table: string
      allowed: string[]
      idempresa: string
      preparedBatch: { entity: CanonicalEntity; row: Record<string, unknown> }[]
      entidadeFks: readonly string[]
      hierarquiaFks: readonly string[]
      produtoFks: readonly string[]
      notaFks: readonly string[]
      financeiroFks: readonly string[]
      planoContasFks: readonly string[]
      requiredParent?: { field: string; table: string }
      warnings: string[]
    }
  ): Promise<number> {
    const {
      kind,
      table,
      allowed,
      idempresa,
      preparedBatch,
      entidadeFks,
      hierarquiaFks,
      produtoFks,
      notaFks,
      financeiroFks,
      planoContasFks,
      requiredParent,
      warnings
    } = args

    const applyOptional = async (
      fields: readonly string[],
      lookupTable: string,
      label: string
    ) => {
      if (fields.length === 0) return
      const ids = collectFkIds(
        preparedBatch.map((p) => p.row),
        fields
      )
      const existing = await this.fetchExistingIds(client, lookupTable, ids)
      for (const item of preparedBatch) {
        const nulled = nullMissingFks(item.row, fields, existing)
        if (nulled.length > 0) {
          warnings.push(
            `${kind}/${item.entity.externalId}: FKs anuladas (${label} ausente): ${nulled.join(', ')}`
          )
        }
      }
    }

    await applyOptional(entidadeFks, 'entidade', 'entidade')
    await applyOptional(hierarquiaFks, 'hierarquia', 'hierarquia')
    await applyOptional(produtoFks, 'produtos', 'produto')
    await applyOptional(notaFks, 'notafiscal', 'nota')
    await applyOptional(financeiroFks, 'financeiro', 'financeiro')
    await applyOptional(planoContasFks, 'planocontas', 'plano de contas')

    let toInsert = preparedBatch
    if (requiredParent) {
      const ids = collectFkIds(
        preparedBatch.map((p) => p.row),
        [requiredParent.field]
      )
      const existing = await this.fetchExistingIds(client, requiredParent.table, ids)
      const kept: typeof preparedBatch = []
      for (const item of preparedBatch) {
        const parentId = resolveScopedFk(requiredParent.field, item.row[requiredParent.field])
        item.row[requiredParent.field] = parentId
        if (!parentId || !existing.has(parentId)) {
          warnings.push(
            `${kind}/${item.entity.externalId}: ignorado (pai ${requiredParent.field} ausente em ${requiredParent.table})`
          )
          continue
        }
        kept.push(item)
      }
      toInsert = kept
    }

    if (toInsert.length === 0) return 0

    await client.query('BEGIN')
    let inserted = 0
    try {
      for (const item of toInsert) {
        const { columns, values } = pickColumns(item.row, allowed, idempresa, table)
        if (!columns.includes('id')) {
          throw new Error(`Linha sem id: ${kind}/${item.entity.externalId}`)
        }
        const sql = buildUpsertSql(table, columns)
        const label = `${kind}/${item.entity.externalId}`
        const useSavepoint = Boolean(requiredParent)
        try {
          if (useSavepoint) await client.query('SAVEPOINT item_row')
          await this.queryFittingVarchar(client, sql, columns, values, label)
          if (useSavepoint) await client.query('RELEASE SAVEPOINT item_row')
          inserted += 1
        } catch (error) {
          if (isConnectionError(error)) throw wrapConnectionError(error)
          if (useSavepoint) {
            try {
              await client.query('ROLLBACK TO SAVEPOINT item_row')
            } catch (rollbackError) {
              if (isConnectionError(rollbackError)) throw wrapConnectionError(error)
              throw rollbackError
            }
          }
          const message = errorMessage(error)
          if (isForeignKeyViolation(error, message)) {
            warnings.push(`${label}: ignorado (${message})`)
            continue
          }
          throw error
        }
      }
      await client.query('COMMIT')
      return inserted
    } catch (error) {
      await this.safeRollback(client)
      throw isConnectionError(error) ? wrapConnectionError(error) : error
    }
  }

  private async withClient<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    const onError = (error: Error) => {
      this.logger.warn({ err: error }, 'Postgres client error')
    }
    client.on('error', onError)
    try {
      return await fn(client)
    } finally {
      client.removeListener('error', onError)
      try {
        client.release()
      } catch {
        try {
          client.release(true)
        } catch {
          /* conexão já morta */
        }
      }
    }
  }

  private async withClientRetry<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    let lastError: unknown
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await this.withClient(fn)
      } catch (error) {
        lastError = error
        if (!isConnectionError(error) || attempt === 3) {
          throw wrapConnectionError(error)
        }
        this.logger.warn(
          { attempt, err: error },
          'Postgres desconectou durante o import; nova tentativa'
        )
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
      }
    }
    throw wrapConnectionError(lastError)
  }

  private async safeRollback(client: pg.PoolClient): Promise<void> {
    try {
      await client.query('ROLLBACK')
    } catch (error) {
      if (!isConnectionError(error)) throw error
    }
  }

  private async queryFittingVarchar(
    client: pg.PoolClient,
    sql: string,
    columns: string[],
    values: unknown[],
    label: string
  ): Promise<void> {
    for (let attempt = 0; attempt <= columns.length; attempt++) {
      try {
        await client.query(sql, values)
        return
      } catch (error) {
        if (isConnectionError(error)) throw wrapConnectionError(error)
        const message = errorMessage(error)
        const max = varcharTooLongMax(message)
        if (max == null) throw error
        const fitted = truncateOverflowingValue(columns, values, max)
        if (!fitted) {
          throw new Error(`${message} (${label})`)
        }
        this.logger.warn(
          { label, column: fitted.column, before: fitted.before, max },
          'Valor truncado para caber no varchar do destino'
        )
      }
    }
    throw new Error(`value too long for type character varying (${label})`)
  }

  /**
   * Liga cada conta ao pai pelo código hierárquico quando idplanocontas está nulo.
   * Ex.: "1 2 1" → pai "1 2".
   */
  private async relinkPlanoContasParents(
    client: pg.PoolClient,
    idempresa: string
  ): Promise<void> {
    const result = await client.query<{
      id: string
      codigo: string | null
      idplanocontas: string | null
    }>(`SELECT id, codigo, idplanocontas FROM planocontas WHERE idempresa = $1`, [idempresa])
    const updates = resolvePlanoContasParentUpdates(result.rows)
    if (updates.length === 0) return

    await client.query('BEGIN')
    try {
      for (const item of updates) {
        await client.query(
          `UPDATE planocontas
           SET idplanocontas = $2
           WHERE id = $1 AND idempresa = $3`,
          [item.id, item.idplanocontas, idempresa]
        )
      }
      await client.query('COMMIT')
      this.logger.info(
        { idempresa, linked: updates.length },
        'Hierarquia do plano de contas religada pelo código'
      )
    } catch (error) {
      await this.safeRollback(client)
      throw error
    }
  }

  /**
   * Substitui o plano de contas da empresa destino pelo importado.
   * Anula FKs (incluindo tabelas fora do escopo) para não disparar CASCADE.
   */
  private async replaceCompanyPlanoContas(
    client: pg.PoolClient,
    idempresa: string
  ): Promise<void> {
    const nullFkTables = [
      'entidade',
      'produtos',
      'financeiro',
      'notafiscal',
      'tipodocumentofinanceiro',
      'operacaofiscal',
      'cfop',
      'contacorrentelancamento'
    ]

    await client.query('BEGIN')
    try {
      for (const table of nullFkTables) {
        await this.tryQuery(
          client,
          `UPDATE ${table}
           SET idplanocontas = NULL
           WHERE idplanocontas IN (SELECT id FROM planocontas WHERE idempresa = $1)`,
          [idempresa],
          `null idplanocontas em ${table}`
        )
      }

      await client.query(
        `UPDATE planocontas SET idplanocontas = NULL WHERE idempresa = $1`,
        [idempresa]
      )
      await this.tryQuery(
        client,
        `DELETE FROM planocontascontacontabil WHERE idempresa = $1`,
        [idempresa],
        'delete planocontascontacontabil'
      )
      const deleted = await client.query(`DELETE FROM planocontas WHERE idempresa = $1`, [
        idempresa
      ])
      await client.query('COMMIT')
      this.logger.info(
        { idempresa, deleted: deleted.rowCount ?? 0 },
        'Plano de contas da empresa substituído pelo UniPlus'
      )
    } catch (error) {
      await this.safeRollback(client)
      throw error
    }
  }

  private async tryQuery(
    client: pg.PoolClient,
    sql: string,
    params: unknown[],
    label: string
  ): Promise<void> {
    try {
      await client.query('SAVEPOINT wipe_fk')
      await client.query(sql, params)
      await client.query('RELEASE SAVEPOINT wipe_fk')
    } catch (error) {
      const message = errorMessage(error)
      const code = (error as { code?: string }).code
      const missing =
        code === '42P01' ||
        code === '42703' ||
        /does not exist|undefined (table|column)/i.test(message)
      try {
        await client.query('ROLLBACK TO SAVEPOINT wipe_fk')
      } catch {
        /* transação já abortada */
      }
      if (missing) {
        this.logger.warn({ label, err: message }, 'Ignorado ao substituir plano de contas')
        return
      }
      throw error
    }
  }

  private async fetchExistingIds(
    client: pg.PoolClient,
    table: string,
    ids: string[]
  ): Promise<Set<string>> {
    if (ids.length === 0) return new Set()
    const result = await client.query<{ id: string }>(
      `SELECT id FROM ${table} WHERE id = ANY($1::text[])`,
      [ids]
    )
    return new Set(result.rows.map((row) => row.id))
  }

  async close(): Promise<void> {
    await this.pool.end()
  }

  private async insertBatches<T>(
    client: pg.PoolClient,
    rows: T[],
    insertOne: (row: T) => Promise<void>
  ): Promise<void> {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      await client.query('BEGIN')
      try {
        for (const row of batch) {
          await insertOne(row)
        }
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
  }
}
