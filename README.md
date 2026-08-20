# MAIS Migration

Aplicação desktop para migrar dados de ERPs de origem para o ERP destino (Mais Gestão / Postgres), orientada a suporte técnico N1.

## Stack

- Electron + Vite + React + TypeScript
- SQLite (`sql.js` / WASM) + Drizzle ORM — **metadados** (jobs/histórico)
- Staging canônico em **JSONL no disco** (`userData/data/staging/`) — evita OOM em migrações grandes
- Postgres (`pg`) — destino Mais Gestão e origem UniPlus
- Firebird (`node-firebird`) — plugin Clipp
- Zod, Pino, Vitest, Zustand, TanStack Query, React Router

## Arquitetura

```text
src/
  domain/           # modelo canônico, contratos de plugin, jobs
  application/      # orquestrador e registry
  infrastructure/   # db local, ipc, importer Postgres, logs
  plugins/demo/     # plugin de referência
  plugins/clipp/    # Firebird TB_CLIENTE/TB_CLI_PF + TB_ESTOQUE/TB_EST_PRODUTO
  plugins/uniplus/  # Postgres UniPlus (entidade, produto, NF, financeiro, OS)
  ui/               # wizard React
  config/           # destino.ini loader
```

Toda integração ERP é um **plugin**. O core conhece apenas a interface `ErpPlugin` e o **modelo canônico**. O destino final é o importador Mais Gestão (Postgres).

## Destino Postgres (`destino.ini`)

1. Copie o exemplo:

```bash
copy config\destino.ini.example config\destino.ini
```

2. Preencha a conexão do Postgres (`[database]`). A **empresa de destino é escolhida no wizard** (lista da tabela `empresas`).

```ini
[database]
host=127.0.0.1
port=5432
database=mais_gestao
user=postgres
password=sua_senha
ssl=false

[migration]
; opcional — sugestão; a seleção real é no frontend
; idempresa=
```

3. Opcional: `DESTINO_INI=C:\caminho\destino.ini` para apontar outro arquivo.

No passo de pré-visualização, selecione a empresa Mais Gestão que receberá clientes/produtos.

Mapeamento deste MVP (Clipp → Mais Gestão):

| Canônico | Tabela Postgres | Observação |
|----------|-----------------|------------|
| `cliente` | `entidade` (`cliente=1`) | ID UUID v5; CPF de `TB_CLI_PF` → `cnpjcpf`; sem CPF → placeholder `CLIPP-{id}` |
| `produto` | `produtos` | ID UUID v5; NCM/EAN/CST/CSOSN/IPI/CEST etc. de `TB_EST_PRODUTO`; sem referência → código de origem |

## Desenvolvimento

```bash
npm install
copy config\destino.ini.example config\destino.ini
npm run dev
```

```bash
npm test
npm run build
```

## Fluxo do wizard

1. Selecionar ERP  
2. Informar conexão (origem)  
3. Processar (detectar → ler → mapear → validar → corrigir)  
4. Pré-visualizar e escolher a empresa de destino  
5. Confirmar importação → **Postgres Mais Gestão**  
6. Relatório / histórico  
7. No **Histórico**, jobs `completed` podem fazer **Rollback** (remove clientes/produtos importados do destino)

## Plugin Clipp

Requisitos:

- **Firebird Server** acessível (padrão `127.0.0.1:3050`)
- Caminho absoluto do `.fdb`
- Credenciais (padrão no form: `masterkey` / `masterkey`; muitos servidores usam `SYSDBA` / `masterkey`)

| Tabela Clipp | Canônico |
|--------------|----------|
| `TB_CLIENTE` + `TB_CLI_PF` (LEFT JOIN) | `cliente` (`CPF`→documento, `IDENTIDADE`→rg, `DT_NASCTO`→nascimento) |
| `TB_ESTOQUE` + `TB_EST_PRODUTO` (LEFT JOIN por `ID_IDENTIFICADOR`) | `produto` |

Campos de `TB_CLI_PF` sem coluna em `entidade` (pai, mãe, profissão, renda, local trabalho, admissão, naturalidade, foto) geram aviso no relatório e não são importados.

Mapeamento principal `TB_EST_PRODUTO` → `produtos`: `COD_BARRA`→ean, `REFERENCIA`→referencia, `COD_NCM`→ncm, `CST`→situacaotributaria, `CSOSN`→situacaotributariasn/tributacaosn, `CST_IPI`→cstipisaida, `IPI`→ipi/percentualipisaida, `COD_CEST`→cest, `IAT`/`IPPT`, `PESO`, `PRC_MEDIO`→customedioinicial, `QTD_MINIM`→quantidademinima, `ULT_COMPRA`→dataultimacompra, `FCI`→numerofci, `VLR_IPI`→valoripiultimanota, `DESC_CMPL`→observacoes, `CSOSN_CFE`→tributacaoespecialnfcesat. Demais colunas sem destino geram aviso.

## Plugin UniPlus

Requisitos:

- Postgres UniPlus acessível (host/porta/banco/usuário/senha; SSL opcional)
- Formulário de conexão no wizard

**IDs:** UUID v5 determinístico `uniplus:<kind>:<id_origem>` (mesmo namespace do Clipp).

**Memória:** extração paginada (1000); sem `arquivoxml*`; preview grava staging em **JSONL no disco** (não no sql.js); import/rollback leem em lotes de 200. O sql.js só guarda metadados leves — DBs legados >32MB são isolados automaticamente (evita `Array buffer allocation failed`).

**Ordem de carga:** hierarquia → entidade → produtos → notafiscal → notafiscalitem → financeiro → financeirolancamento → ordemservico → eventos → faturamento → itens → lotes.

**FKs do escopo** (`identidade`, `idproduto`, `idnotafiscal`, `idhierarquia`→`idgrupo`, etc.) são remapeadas. **FKs auxiliares** (cidade, CFOP, banco, usuário, NCM cadastro, etc.) vão `NULL` com aviso.

| Tabela UniPlus | Destino Mais Gestão |
|----------------|---------------------|
| `hierarquia` | `hierarquia` |
| `entidade` | `entidade` (`transportadora`→`transportador`) |
| `produto` | `produtos` |
| `notafiscal` / `notafiscalitem` | `notafiscal` / `notafiscalitem` |
| `financeiro` / `financeirolancamento` | `financeiro` / `financeirolancamento` |
| OS (+ evento, faturamento, item, itemlote) | tabelas homônimas |

Empresa destino: sempre a selecionada no wizard (`idempresa`). `idfilial` UniPlus é ignorado.

## Adicionar um novo ERP

1. Crie `src/plugins/<nome>/` com `manifest.json`, `connector`, `extractor`, `mapper`, `validator`
2. Exporte `createXxxPlugin(): ErpPlugin`
3. Registre a factory em `createDefaultPluginRegistry()`
4. Converta sempre para o modelo canônico — nunca importe direto no destino

## Observações

- Credenciais não devem aparecer em logs (redaction via Pino)
- `config/destino.ini` está no `.gitignore`
- Schema de referência do destino: `.cursor/context/mais-gestao/`
