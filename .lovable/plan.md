# Plano — Sprints 6, 7 e 8

Três módulos novos + reforço do monitor de impressoras. Execução sequencial: migração única → tipos → UI módulo a módulo.

## Sprint 6 — Licenças de Software

### Base de dados (migração)
- `licencas_software`
  - `nome`, `fabricante`, `tipo` (perpetua/subscricao/oem/volume/freeware), `chave` (texto, opcional)
  - `quantidade_total` (int), `data_aquisicao`, `data_validade`, `valor`, `fornecedor_id` → `fornecedores`
  - `notas`, `empresa_id` → `empresas`
- `licenca_atribuicoes`
  - `licenca_id`, `tipo_alvo` (`utilizador`|`ativo`|`empresa`), `alvo_id` (uuid),
    `atribuido_em`, `revogado_em` (null = ativa), `notas`
  - Trigger garante `quantidade_atribuida_ativa <= quantidade_total` (RAISE EXCEPTION).
- Função `licenca_utilizadas(_id)` → contagem de atribuições ativas.
- RLS: leitura para `authenticated`; escrita só `admin`/`manager` via `has_role`.
- Histórico em `movimentacoes` não aplica; manter histórico próprio em `licenca_atribuicoes` (revoga = soft).

### Frontend
- `/licencas` — listagem (cards/tabela), busca, filtro por estado (ativa/expirada/expirando) e fabricante.
- `/licencas/nova` e edição inline (drawer).
- Detalhe: aba **Atribuições** (adicionar/revogar a utilizador/ativo/empresa), aba **Histórico**.
- Sidebar: novo item “Licenças”.
- Alertas:
  - Gerados via função SQL `gerar_alertas_licencas()` chamada por server fn manual + botão no dashboard.
  - Tipos novos do enum `alerta_tipo`: `licenca_90d`, `licenca_60d`, `licenca_30d`, `licenca_expirada`, `licenca_excedida`.
- Dashboard: novo bloco com 4 KPIs (total, ativas, expiradas, próximas).

## Sprint 7 — Contratos e Serviços

### Base de dados
- `contratos`
  - `nome`, `fornecedor_id`, `categoria` (enum: internet, impressoras, manutencao, software, seguranca, outros),
    `tipo_servico`, `valor` (numeric), `moeda` (default `'AOA'`),
    `periodicidade` (mensal/trimestral/anual/unico),
    `data_inicio`, `data_vencimento`, `renovacao_automatica` (bool),
    `empresa_id`, `notas`
- `contrato_documentos`
  - `contrato_id`, `versao` (int), `path` (storage), `nome_ficheiro`, `tamanho`, `mime`, `enviado_por`, `created_at`
  - Bucket privado `contratos` (criar via tool).
- Enum `alerta_tipo` ganha: `contrato_90d|60d|30d|expirado`.
- RLS idêntica a licenças. GRANTs completos.

### Frontend
- `/contratos` — tabela com filtros (categoria, fornecedor, estado), busca.
- Drawer de cadastro/edição; upload de PDF (versionado: cada upload novo cria nova versão).
- Detalhe: aba Geral, aba Documentos (lista versões + download via signed URL), aba Histórico.
- Dashboard novo bloco: contratos ativos, próximos vencimento, **custo mensal** (soma normalizada por periodicidade) e **custo anual**.
- Sidebar: “Contratos”.

## Sprint 8 — Monitoramento de Impressoras

Refinar o que já existe (`impressoras`, `impressora_leituras`, agente local, alertas via trigger). Sem mudanças de schema relevantes — só ajustes finos.

### Backend
- Server fn `testarConectividadeImpressora(id)`:
  - admin only; usa `supabaseAdmin` para registar tentativa em `movimentacoes` (tipo `diagnostico`).
  - Marca `status_online` conforme retorno; tenta `fetch` simples ao IP (HTTP 80/443) — SNMP real fica no agente.
- Server fn `diagnosticoSNMP(id)`: retorna últimas 5 leituras + cálculo de gaps (>15min sem leitura = alerta).
- Endpoint `/api/public/printers/ingest` já existe — adicionar:
  - Logs detalhados de erro (gravar em nova coluna `ultimo_erro` em `impressoras` quando ingest falha por validação).
  - Migração mínima: `ALTER TABLE impressoras ADD COLUMN ultimo_erro text, ultimo_erro_em timestamptz`.

### Frontend
- `/impressoras/$id`: já tem KPIs + toner + previsão.
  - Adicionar botão **Testar conectividade** (admin), botão **Diagnóstico SNMP** (modal com gaps), card **Último erro**.
  - Linha temporal de eventos (online/offline + alertas gerados) lendo `movimentacoes` tipo `leitura_snmp` + `alertas`.
- `/impressoras` index: refresh automático 30s (já parcial), badges KPI no topo:
  - online, offline, consumíveis críticos (toner<20% OR papel<25%), top 5 mais utilizadas (por `contador_impressoes` Δ últimos 30d).
- Threshold já no trigger SQL (`<20` crítico, `<40` baixo, papel `<25`). Confirmar e expor em Configurações → Alertas como **somente leitura** (já está editável; manter).

## Ordem de execução
1. Migração única cobrindo Sprints 6+7+8 (tabelas, enums, funções, bucket, RLS, GRANTs).
2. Esperar regen de `types.ts`.
3. UI Sprint 6 → Sprint 7 → Sprint 8.
4. Sidebar + Dashboard atualizados ao final.

## Fora de escopo (confirmado pelo pedido)
- Integração Microsoft 365 / SSO de licenças.
- Assinatura eletrónica, fluxo de aprovação de contratos.
- Monitoramento de PCs/switches, descoberta automática de impressoras.
