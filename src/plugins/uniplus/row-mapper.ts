import { destinationId } from '@infrastructure/importer/mais-gestao-ids'
import { KIND_TO_TABLE, UNIPLUS_TABLE_COLUMNS } from '@infrastructure/importer/uniplus-import-columns'
import type { EntityKind } from '@domain/canonical/types'

/** FKs do escopo migrado: campo origem → kind UUID */
const SCOPE_FK: Partial<Record<EntityKind, Record<string, string>>> = {
  plano_contas: {
    idplanocontas: 'plano_contas'
  },
  entidade: {
    idrepresentante: 'entidade',
    idrepresentante2: 'entidade',
    idrepresentante3: 'entidade',
    idtransportadora: 'entidade',
    idplanocontas: 'plano_contas'
  },
  produto: {
    idfornecedor: 'entidade',
    idhierarquia: 'hierarquia',
    idfabricante: 'entidade',
    idcomprador: 'entidade',
    idplanocontas: 'plano_contas'
  },
  nota_fiscal: {
    identidade: 'entidade',
    idtransportadora: 'entidade',
    idrepresentante: 'entidade',
    idrepresentante2: 'entidade',
    idnotafiscaltransferenciadestino: 'nota_fiscal',
    idnotafiscaltransfdestino: 'nota_fiscal',
    idnotareferenciada: 'nota_fiscal',
    idplanocontas: 'plano_contas'
  },
  nota_fiscal_item: {
    idnotafiscal: 'nota_fiscal',
    idproduto: 'produto',
    idprodutokit: 'produto'
  },
  financeiro: {
    identidade: 'entidade',
    idorigem: 'nota_fiscal',
    idrepresentante: 'entidade',
    idrepresentante2: 'entidade',
    idplanocontas: 'plano_contas'
  },
  financeiro_lancamento: {
    idfinanceiro: 'financeiro'
  },
  ordem_servico: {
    idcliente: 'entidade',
    idproduto: 'produto',
    iddocumentofiscal: 'nota_fiscal',
    idrepresentante2: 'entidade'
  },
  ordem_servico_evento: {
    idordemservico: 'ordem_servico'
  },
  ordem_servico_faturamento: {
    idordemservico: 'ordem_servico',
    idnotafiscal: 'nota_fiscal',
    idfaturamento: 'financeiro'
  },
  ordem_servico_item: {
    idordemservico: 'ordem_servico',
    idproduto: 'produto',
    idprodutokit: 'produto',
    iditemkitpai: 'ordem_servico_item'
  },
  ordem_servico_item_lote: {
    idordemservicoitem: 'ordem_servico_item'
  }
}

/** FKs auxiliares: anular se preenchidas */
const AUX_FK_PREFIXES = [
  'idcidade',
  'idestado',
  'idpais',
  'idcfop',
  'idncm',
  'idcest',
  'idbanco',
  'idplanocontas',
  'idtipodocumento',
  'idtipocobranca',
  'idcondicaopag',
  'idusuario',
  'idatendente',
  'idtecnico',
  'idultimotecnico',
  'idarea',
  'idprioridade',
  'idtipoproblema',
  'idobjeto',
  'idlocalestoque',
  'idunidademedida',
  'idclassificacaofiscal',
  'idoperacao',
  'idserie',
  'idmotivodesconto',
  'idpromocao',
  'idembalagem',
  'idlote',
  'idportador',
  'idadministradora',
  'idbandeira',
  'idcarteira',
  'idconta',
  'idcodigocontabil',
  'idbasecalculocredito',
  'idreceitasemcontribuicao',
  'idcontribuicao',
  'idtipocredito',
  'idenquadramento',
  'idbeneficio',
  'idtabela',
  'iddepartamento',
  'idpontoimpressao',
  'idgrupo',
  'idgrade',
  'idfamilia',
  'idmarca',
  'idrepositor',
  'idregiao',
  'idrota',
  'idfilial',
  'idtipoevento',
  'idtipoentidade',
  'idincentivo',
  'idclassificacao',
  'idcategoria',
  'idpagamento',
  'idconfiguracao',
  'idtransacao',
  'idintermediador',
  'idlocalretirada',
  'iddependente',
  'idregime',
  'idtranspredesp',
  'idbeneficiador',
  'idclientedobeneficiador',
  'idobservacao',
  'idajuste',
  'idrequisicao',
  'idativo',
  'iddav',
  'idorcamento',
  'idpedido',
  'idvasilhame',
  'idtara',
  'idvalornutricional',
  'idultimopreco',
  'idmercadolivre',
  'idanotaai',
  'idifood',
  'idmercos',
  'idgrupofornecedor',
  'idoperadora',
  'idlotetokenizacao',
  'idformapagamento',
  'idtabelapreco'
]

/** Renomes origem → destino */
const RENAMES: Partial<Record<EntityKind, Record<string, string>>> = {
  entidade: {
    transportadora: 'transportador'
  },
  produto: {
    idhierarquia: 'idgrupo',
    idfornecedor: 'fornecedor',
    customedio: 'customedioinicial',
    hierarquia: '_hierarquia_nome_ignorado'
  },
  nota_fiscal: {
    informacoescomplementaresgeradas: 'infocompgerada',
    informacoescomplementares: 'infocomppersonalizada',
    informacoesfisco: 'infofisco'
  },
  ordem_servico_item: {
    codigoproduto: 'codigorproduto'
  }
}

function isAuxFk(field: string): boolean {
  const lower = field.toLowerCase()
  if (lower === 'id' || lower === 'idempresa' || lower === 'identidade') return false
  // identidade is entidade FK - handled in scope
  return AUX_FK_PREFIXES.some(
    (p) => lower === p || lower.startsWith(p) || (p.endsWith('id') === false && lower.startsWith(p))
  )
}

function remapValue(kind: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  return destinationId(kind, String(value), 'uniplus')
}

export interface MapRowResult {
  row: Record<string, unknown>
  warnings: string[]
}

/**
 * Converte linha UniPlus (lowercase keys) para colunas destino com UUIDs remapeados.
 * idempresa é injetado no importador.
 */
export function mapUniplusRow(kind: EntityKind, raw: Record<string, unknown>): MapRowResult {
  const warnings: string[] = []
  const scope = SCOPE_FK[kind] ?? {}
  const renames = RENAMES[kind] ?? {}
  const out: Record<string, unknown> = {}
  const auxNulled: string[] = []

  for (const [key, value] of Object.entries(raw)) {
    const lower = key.toLowerCase()
    if (lower === 'idfilial' || lower === 'currenttimemillis') continue

    let destKey = renames[lower] ?? lower
    if (destKey.startsWith('_')) continue

    if (lower === 'id') {
      out.id = destinationId(kind, String(value), 'uniplus')
      continue
    }

    if (scope[lower]) {
      const mapped = remapValue(scope[lower], value)
      // apply rename for scoped fk too (idhierarquia → idgrupo)
      out[destKey] = mapped
      continue
    }

    // identidade is always entidade when present
    if (lower === 'identidade' || lower === 'identidadedestino') {
      if (lower === 'identidadedestino') {
        // Mais Gestão schema has identidadedestino as bigint in some versions — skip unsafe
        if (value !== null && value !== undefined && value !== '') {
          auxNulled.push(lower)
        }
        continue
      }
      out.identidade = remapValue('entidade', value)
      continue
    }

    if (isAuxFk(lower) && !scope[lower]) {
      if (value !== null && value !== undefined && value !== '') {
        auxNulled.push(lower)
      }
      out[destKey] = null
      continue
    }

    out[destKey] = value
  }

  // Produto: garantir descricao/nome
  if (kind === 'produto') {
    const nome = String(out.nome ?? out.descricao ?? raw.nome ?? '').trim()
    out.nome = nome || `Produto ${raw.id}`
    out.descricao = String(out.descricao ?? '').trim() || String(out.nome).slice(0, 100)
    if (out.unidademedida == null && raw.unidademedida) {
      out.unidademedida = raw.unidademedida
    }
    if (!out.unidademedida) out.unidademedida = 'UN'
    if (out.tipo == null) out.tipo = 'P'
    if (out.tipoproduto == null) out.tipoproduto = '01'
    if (out.inativo == null) out.inativo = 0
  }

  if (kind === 'entidade') {
    const nome = String(out.nome ?? '').trim()
    out.nome = nome || `Entidade ${raw.id}`
    if (!out.razaosocial) out.razaosocial = out.nome
    const doc = String(out.cnpjcpf ?? '').replace(/\D/g, '')
    if (!doc) {
      out.cnpjcpf = `UNIPLUS-${raw.id}`
      warnings.push(`CPF/CNPJ ausente; placeholder ${out.cnpjcpf}`)
    } else {
      out.cnpjcpf = doc
    }
    if (out.cliente == null) out.cliente = 0
    if (out.fornecedor == null) out.fornecedor = 0
    if (out.transportador == null) out.transportador = 0
    if (out.representante == null) out.representante = 0
  }

  if (kind === 'hierarquia') {
    const nome = String(out.nome ?? '').trim()
    out.nome = nome || `Grupo ${raw.id}`
  }

  if (kind === 'plano_contas') {
    const nome = String(out.nome ?? '').trim()
    out.nome = nome || `Conta ${raw.id}`
    if (out.inativo == null) out.inativo = 0
  }

  if (kind === 'ordem_servico_evento') {
    // idtipoevento é obrigatório no Mais Gestão — usa tipo sintético migrado
    out.idtipoevento = destinationId('tipo_os_evento', 'default', 'uniplus')
    out.idtecnicode = null
    out.idtecnicopara = null
    if (!out.descricao) out.descricao = 'Evento migrado UniPlus'
  }

  if (auxNulled.length > 0) {
    warnings.push(
      `FKs auxiliares anuladas (cadastro não migrado): ${[...new Set(auxNulled)].slice(0, 12).join(', ')}${auxNulled.length > 12 ? '…' : ''}`
    )
  }

  return { row: slimRow(kind, out), warnings }
}

/** Mantém só colunas que o importador grava — reduz staging/sql.js */
function slimRow(kind: EntityKind, row: Record<string, unknown>): Record<string, unknown> {
  const table = KIND_TO_TABLE[kind]
  if (!table) return row
  const allowed = new Set(UNIPLUS_TABLE_COLUMNS[table] ?? [])
  const slim: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (allowed.has(key) || key === 'id') {
      slim[key] = value
    }
  }
  return slim
}
