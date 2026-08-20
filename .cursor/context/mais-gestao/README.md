\# Mais Gestão

## Descrição

O Mais Gestão é um ERP voltado para automação comercial via web.

Este diretório contém informações necessárias para que a IA compreenda a estrutura do banco de dados e possa criar processos de migração, essas tabelas são usadas que receberam os dados de outro ERP.

---

## Objetivo

Sempre que receber migração de outros ERP, utilizar este diretório como fonte principal de conhecimento.

---

## Estrutura

/schema
Estrutura das tabelas, cada arquivo dentro é uma tabela dentro do banco de dados, você consegue enxergar nome da tabela, nome das colunas e os relacionamentos que cada uma faz.


---

## Convenções

- Sempre consultar /schema.
- Priorizar chaves primárias e estrangeiras.
- Quando existir maias de uma possibilidade de mapeamento, registrar uma observação.

---

## Prioridade de migração

Priorizar as tabelas de acordo com cada regra dos ERP selecionados, cada ERP tem tabelas que podem ser importados os dados ou não.

1. Empresa
2. Usuários
3. Clientes
4. Fornecedores
5. Produtos
6. Estoque
7. Financeiro
8. Vendas
9. Fiscal
10. Ordem de serviços



\---



