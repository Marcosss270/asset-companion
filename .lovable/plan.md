
# Plano — Sprints 3, 4 e 5

Três sprints encadeadas. Vou executar nesta ordem porque uma alimenta a outra: as Configurações guardam dados que os Relatórios usam no cabeçalho; o ciclo de vida usa thresholds das Configurações.

---

## Sprint 3 — Configurações Funcionais

### Banco
Migração única acrescentando:
- `empresas.padrao boolean default false` + índice único parcial (apenas uma padrão).
- Seeds das 6 empresas (PR, ARQA3, ACADA3, LQ, PV, MG) — INSERT idempotente.
- Tabela `ativo_estados (id, nome, cor, ordem)` editável (hoje é enum fixo) — opcional; se ficar muito invasivo, mantenho enum e apenas exponho leitura na UI. **Decisão**: manter enum (não quebrar triggers existentes) e gerir só rótulos/cores via `configuracoes.estados`.
- Bucket `branding` para logotipo da organização.

### Front
Reescrever `/configuracoes` com 4 abas (mantém estrutura atual, expande):
- **Organização**: nome, logo (upload), email, telefone, endereço — persistidos em `configuracoes.organizacao`.
- **Empresas**: lista inline com criar/editar/desativar + botão "Definir padrão" (estrela).
- **Inventário**: preview do formato de código `[EMPRESA]-[TIPO]-[ANO]-[NÚMERO]` (somente leitura, é fixo no trigger), link p/ gestão de categorias, estoque mínimo padrão, gestão de rótulos/cores de estados.
- **Alertas**: thresholds toner/papel (já existe) + estoque crítico + manutenção preventiva (dias) + garantia próxima (dias — 30/60/90).

Salvamento automático com debounce + toast discreto.

---

## Sprint 4 — Central de Relatórios

### Front
Reescrever `/relatorios` como hub com cards por categoria:
- **Ativos**: geral, por empresa, por categoria, por estado.
- **Consumíveis**: estoque atual, consumo por período, movimentações, críticos.
- **Financeiros**: valor patrimonial por empresa, total, custos de manutenção, custos por categoria.

Cada relatório abre num drawer/modal com:
- Filtros (empresa, período, categoria, estado conforme aplicável).
- Pré-visualização tabular.
- Botões: Exportar PDF, Exportar Excel, Imprimir.

### Exportação
- **PDF**: `jspdf` + `jspdf-autotable` com cabeçalho usando dados da organização (logo, nome, contactos) e rodapé com data/paginação.
- **Excel**: `xlsx` (SheetJS) — gera workbook formatado.
- **Impressão**: rota dedicada com `@media print` (reusa padrão de `/etiquetas`).

Arquivos:
- `src/lib/reports/queries.ts` — funções de agregação (server fns onde necessário).
- `src/lib/reports/pdf.ts`, `src/lib/reports/excel.ts` — geradores.
- `src/components/report-viewer.tsx` — preview + ações.

### Dependências
`bun add jspdf jspdf-autotable xlsx`.

---

## Sprint 5 — Garantias e Ciclo de Vida

### Banco
- Tabela `ativo_garantias (id, ativo_id, data_inicio, data_fim, fornecedor_id, nota, created_at)` — múltiplas garantias por ativo (renovações).
- Função `saude_ativo(ativo_id)` retornando `'novo'|'bom'|'regular'|'critico'` baseada em idade, nº manutenções, status, garantia.
- Job de geração de alertas de garantia (90/60/30 dias) — implementado como server fn invocada manualmente + ao abrir o dashboard (sem cron por enquanto).

### Front
- `/ativos/$id`: nova secção **Garantia & Ciclo de Vida**:
  - Cards: data compra, início garantia, fim garantia, fornecedor.
  - Badge de saúde (Novo/Bom/Regular/Crítico) com cor.
  - Timeline de garantia (inicial + renovações + trocas).
  - Botão "Renovar garantia" / "Registar substituição".
- `/dashboard`: novo bloco **Garantias** com 3 contadores (próximas 90d, expiradas, sem garantia) — clicável para `/relatorios` filtrado.
- `/alertas`: integração já existente, apenas novos tipos `garantia_90`, `garantia_60`, `garantia_30`, `garantia_expirada`.

### Arquivos
- Migração nova.
- `src/lib/lifecycle.ts` — cálculo de saúde + geração de alertas.
- `src/components/asset-health-badge.tsx`.
- `src/components/garantia-timeline.tsx`.
- Edição de `ativos.$id.tsx`, `dashboard.tsx`.

---

## Ordem de execução

1. Migração Sprint 3 (empresas.padrao + seeds + bucket branding).
2. Migração Sprint 5 (ativo_garantias + função saude_ativo).
3. Code: Sprint 3 → Sprint 4 → Sprint 5.
4. Verificar build.

## NÃO incluído (conforme pedido)
- Multiempresa SaaS, permissões avançadas, integrações externas.
- BI/dashboards analíticos complexos.
- Depreciação/amortização contabilística.

Confirma para eu começar?
