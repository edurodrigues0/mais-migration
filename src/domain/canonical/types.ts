import { z } from 'zod'

export const EntityKindSchema = z.enum([
  'empresa',
  'cliente',
  'produto',
  'fornecedor',
  'estoque',
  'pedido',
  'venda',
  'ordem_servico',
  'contas_pagar',
  'contas_receber',
  'financeiro',
  'entidade',
  'hierarquia',
  'plano_contas',
  'taxa_uf',
  'financeiro_lancamento',
  'nota_fiscal',
  'nota_fiscal_item',
  'ordem_servico_evento',
  'ordem_servico_faturamento',
  'ordem_servico_item',
  'ordem_servico_item_lote'
])

export type EntityKind = z.infer<typeof EntityKindSchema>

export const EmpresaSchema = z.object({
  razaoSocial: z.string().min(1),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional()
})

export const ClienteSchema = z.object({
  nome: z.string().min(1),
  documento: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cep: z.string().optional(),
  complemento: z.string().optional(),
  rg: z.string().optional(),
  nascimento: z.string().optional()
})

export const ProdutoSchema = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(1),
  unidade: z.string().default('UN'),
  preco: z.number().nonnegative().default(0),
  ncm: z.string().optional(),
  referencia: z.string().optional(),
  ean: z.string().optional(),
  iat: z.string().optional(),
  ippt: z.string().optional(),
  ipi: z.number().optional(),
  ipiEntrada: z.number().optional(),
  percentualIpiSaida: z.number().optional(),
  cstIpiSaida: z.string().optional(),
  cstIpiEntrada: z.string().optional(),
  situacaoTributaria: z.string().optional(),
  situacaoTributariaSn: z.string().optional(),
  situacaoTributariaSnEntrada: z.string().optional(),
  tributacaoEspecialNfceSat: z.string().optional(),
  cest: z.number().int().optional(),
  /** Código CEST só dígitos, para lookup de idcest no destino */
  cestCodigo: z.string().optional(),
  /** CFOP de saída só dígitos, para lookup de idcfopsaida no destino */
  cfopSaida: z.string().optional(),
  cstPis: z.string().optional(),
  cstPisEntrada: z.string().optional(),
  cstCofins: z.string().optional(),
  cstCofinsEntrada: z.string().optional(),
  aliquotaPis: z.number().optional(),
  aliquotaCofins: z.number().optional(),
  aliquotaPisEntrada: z.number().optional(),
  aliquotaCofinsEntrada: z.number().optional(),
  /** Código TB_TAXA_UF.ID_CTI para lookup de idtaxauf no destino */
  taxaUfCodigo: z.string().optional(),
  numeroFci: z.string().optional(),
  peso: z.number().optional(),
  custoMedioInicial: z.number().optional(),
  quantidadeMinima: z.number().int().optional(),
  dataUltimaCompra: z.string().optional(),
  valorIpiUltimaNota: z.number().optional(),
  observacoes: z.string().optional(),
  inativo: z.number().int().min(0).max(1).optional()
})

export const FornecedorSchema = z.object({
  nome: z.string().min(1),
  documento: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional()
})

export const TaxaUfSchema = z.object({
  codigo: z.string().min(1).max(4),
  descricao: z.string().min(1),
  baseIcms: z.number().optional(),
  baseIcmsFe: z.number().optional(),
  baseIcmsSt: z.number().optional(),
  ufAc: z.number().optional(),
  ufAl: z.number().optional(),
  ufAm: z.number().optional(),
  ufAp: z.number().optional(),
  ufBa: z.number().optional(),
  ufCe: z.number().optional(),
  ufDf: z.number().optional(),
  ufEs: z.number().optional(),
  ufGo: z.number().optional(),
  ufMa: z.number().optional(),
  ufMg: z.number().optional(),
  ufMs: z.number().optional(),
  ufMt: z.number().optional(),
  ufPa: z.number().optional(),
  ufPb: z.number().optional(),
  ufPe: z.number().optional(),
  ufPi: z.number().optional(),
  ufPr: z.number().optional(),
  ufRj: z.number().optional(),
  ufRn: z.number().optional(),
  ufRo: z.number().optional(),
  ufRr: z.number().optional(),
  ufRs: z.number().optional(),
  ufSc: z.number().optional(),
  ufSe: z.number().optional(),
  ufSp: z.number().optional(),
  ufTo: z.number().optional(),
  baseIss: z.number().optional(),
  iss: z.number().optional(),
  porDif: z.number().optional(),
  bcPorUf: z.string().max(1).optional()
})

export const CanonicalPayloadSchemas = {
  empresa: EmpresaSchema,
  cliente: ClienteSchema,
  produto: ProdutoSchema,
  fornecedor: FornecedorSchema,
  taxa_uf: TaxaUfSchema
} as const

export type Empresa = z.infer<typeof EmpresaSchema>
export type Cliente = z.infer<typeof ClienteSchema>
export type Produto = z.infer<typeof ProdutoSchema>
export type Fornecedor = z.infer<typeof FornecedorSchema>
export type TaxaUf = z.infer<typeof TaxaUfSchema>

export interface CanonicalEntity<T = unknown> {
  externalId: string
  sourceSystem: string
  kind: EntityKind
  payload: T
  warnings: string[]
}

export interface SourceEntity {
  externalId: string
  kind: EntityKind
  raw: Record<string, unknown>
}
