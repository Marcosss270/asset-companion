# Plano — Sprints 12, 13, 14 e 15

Quatro sprints com forte interdependência: multi-tenant é a fundação; planos, billing e onboarding sentam-se em cima dela. Faço numa única migração grande para evitar várias rondas de regen de types.

## Sprint 12 — Multi-tenant (fundação)

### Banco
- Nova tabela `organizacoes`: `id`, `nome`, `sigla` (unique), `logo_url`, `estado` (`ativa|inativa|suspensa`), `plano_id` (fk, nullable nesta sprint), `is_tenant_master` (bool), `created_at`, `updated_at`.
- Seed: cria automaticamente "Grupo A3" com `is_tenant_master=true`, `estado='ativa'`.
- Novo enum em `app_role`: adicionar `tenant_master` (já existem admin/manager/viewer).
- Coluna `organizacao_id uuid` (NOT NULL após backfill, FK → organizacoes) adicionada a:
  - `ativos`, `empresas`, `fornecedores`, `fornecedor_produtos`, `categorias`, `estoque_consumiveis`, `impressoras`, `impressora_leituras`, `contratos`, `contrato_documentos`, `licencas_software`, `licenca_atribuicoes`, `ativo_garantias`, `manutencoes`, `movimentacoes`, `alertas`, `sugestoes_compra`, `agentes`, `agente_inventarios`, `agente_eventos`, `dispositivos_descobertos`, `audit_log`, `configuracoes`.
  - `profiles` recebe `organizacao_id` (org "atual" do utilizador).
  - `user_roles` recebe `organizacao_id` (papel é por org; mesmo utilizador pode ter papéis diferentes em orgs distintas).
- Backfill: tudo existente → org "Grupo A3".
- Funções helper SECURITY DEFINER:
  - `current_org_id()` → lê `organizacao_id` do `profiles` do `auth.uid()`.
  - `is_tenant_master(_uid uuid)` → true se o user tem papel `tenant_master` em qualquer org marcada `is_tenant_master`.
  - `has_org_access(_uid uuid, _org uuid)` → tenant_master OU `_org = current_org_id(_uid)`.
- RLS reescrita em todas as tabelas acima: `USING (has_org_access(auth.uid(), organizacao_id))`. Tenant master vê tudo.
- Triggers `before insert` para auto-preencher `organizacao_id := current_org_id()` quando não fornecido.
- Tabela `org_access_log` (`usuario_id`, `organizacao_id`, `acao`, `ip`, `user_agent`, `created_at`) — escrita por funções SECURITY DEFINER de troca de org.

### Frontend
- `/organizacoes` (apenas tenant_master): lista, criar, editar, ativar/desativar.
- Seletor de organização no topbar (apenas tenant_master) → chama `switch_organization(_org_id)` server fn que atualiza `profiles.organizacao_id` e regista log.
- Hook `useOrg()` devolve org atual + flag `isTenantMaster`.
- Sidebar: nova secção "Plataforma" (tenant_master only) com "Organizações".

## Sprint 13 — Planos comerciais

### Banco
- Tabela `planos`: `id`, `nome` (`Starter|Pro|Enterprise|custom`), `slug` (unique), `preco_mensal`, `preco_anual`, `limite_ativos` (nullable=ilimitado), `limite_usuarios`, `features` (jsonb: `{snmp, agent, descoberta, contratos, garantias, licencas, relatorios_avancados, suporte_prioritario}`), `ativo` (bool), `ordem`.
- Seed: Starter (100/2), Pro (1000/20), Enterprise (null/null + tudo).
- `organizacoes.plano_id` FK → planos (após seed, default = Starter; Grupo A3 = Enterprise).
- Função `org_pode_recurso(_org uuid, _feature text)` → checa plano.
- Função `org_dentro_do_limite(_org uuid, _recurso text)` → conta ativos/users vs limite, retorna bool.
- Triggers em `ativos` (BEFORE INSERT) e em `user_roles` (BEFORE INSERT por org) → bloqueia se exceder, retorna mensagem clara.

### Frontend
- `/planos` (público dentro do app, tenant_master pode editar): cards comparativos Starter/Pro/Enterprise, checklist de features, badge "Seu plano".
- `/organizacoes/$id` aba "Plano": trocar plano (tenant_master only).
- Hook `usePlano()` e componente `<FeatureGate feature="snmp">` que esconde rotas/botões indisponíveis no plano da org.
- Aplicar `<FeatureGate>` nas entradas de sidebar para A3 Agent, Descoberta, Contratos, Licenças, Garantias conforme features.
- Banner topo quando limite ≥ 80%: "Você usa 85/100 ativos. Considere upgrade."

## Sprint 14 — Billing & Assinaturas (scaffold, sem gateway)

### Banco
- Tabela `assinaturas`: `id`, `organizacao_id`, `plano_id`, `ciclo` (`mensal|anual`), `estado` (`trial|ativa|suspensa|cancelada|expirada`), `data_inicio`, `data_renovacao`, `valor`, `trial_fim`, `created_at`, `updated_at`. Uma ativa por org (índice único parcial).
- Tabela `pagamentos`: `id`, `assinatura_id`, `valor`, `estado` (`pendente|pago|falhou|estornado`), `metodo` (`manual|stripe|paypal` — só `manual` por agora), `pago_em`, `referencia`, `created_at`.
- Função `criar_assinatura_trial(_org uuid, _plano uuid)` → cria com `estado='trial'`, `trial_fim = now()+14d`.
- Função `expirar_trials()` (chamável via cron futuro) → trial vencido vira `expirada` + suspende org.
- Trigger atualiza `organizacoes.estado` quando assinatura muda.

### Frontend
- `/billing` (tenant_master): dashboard SaaS com KPIs (orgs ativas, MRR = soma mensal, ARR = MRR×12, trials ativos, expiradas).
- Tabela de organizações com plano, estado, próxima cobrança, ações (suspender/reativar/trocar plano).
- `/organizacoes/$id` aba "Assinatura": histórico de pagamentos, próxima cobrança, botão "Marcar pago" (manual).
- Sidebar tenant_master: "Billing".

## Sprint 15 — Onboarding & Trial

### Banco
- `organizacoes` ganha: `moeda` (default `EUR`), `pais`, `setor`, `onboarding_completo` (bool), `onboarding_passos` (jsonb com flags).
- Tabela `departamentos` (`id`, `organizacao_id`, `nome`, `codigo`) e `centros_custo` (`id`, `organizacao_id`, `nome`, `codigo`).
- Função `org_checklist(_org)` → retorna `{empresa, usuarios, ativos, fornecedores, relatorio}` (cada bool) + percentual.

### Frontend
- `/onboarding` (full-screen wizard, apenas se `!onboarding_completo`):
  1. Bem-vindo (logo + intro).
  2. Conhecer a empresa (nome, sigla, logo upload, moeda, país, setor).
  3. Configuração inicial (departamentos, centros de custo, categorias-padrão "criar pacote inicial", fornecedores iniciais).
  4. Importação (upload .xlsx, templates download para ativos/consumíveis/fornecedores, validação + relatório de erros — usa `xlsx` lib client-side).
  5. Finalização (resumo + "Ir para Dashboard").
- Botão "Continuar depois" persiste passo atual em `onboarding_passos`.
- Dashboard: bloco "Checklist de Ativação" com 5 itens e barra de progresso; some quando 100%.
- Bloco "Trial" no dashboard quando assinatura em trial: dias restantes (`trial_fim - now()`), CTA "Fazer upgrade".
- `/ajuda`: página estática com guias rápidos, FAQ accordion, placeholders para vídeos.
- Templates Excel servidos de `public/templates/{ativos,consumiveis,fornecedores}.xlsx` (gerados via skill xlsx no momento da entrega).

## Ordem de execução
1. Migração única (Sprints 12+13+14+15): tabelas, FKs, backfill, funções, RLS, triggers, seeds.
2. Aguardar regen de types.
3. Helpers TS: `useOrg`, `usePlano`, `<FeatureGate>`, server fns `switch_organization`, `org_checklist`.
4. UI Sprint 12 (Organizações + topbar selector).
5. UI Sprint 13 (Planos + gates aplicados).
6. UI Sprint 14 (Billing dashboard + assinaturas).
7. UI Sprint 15 (Onboarding wizard + checklist + trial banner + /ajuda + templates xlsx).
8. Sidebar reorganizada (secção "Plataforma" para tenant_master).

## Fora de escopo (confirmado)
- Pagamentos reais (Stripe/PayPal/Paddle) — só estrutura.
- Cobrança automática, faturas PDF.
- Chat de suporte, base de conhecimento completa, vídeos reais.
- Trial estendido / planos pagos negociados / cupões.

## Riscos
- Migração toca ~25 tabelas: faço backfill cuidadoso e adiciono `organizacao_id` como nullable, backfill, depois `SET NOT NULL`.
- RLS reescrita pode quebrar queries existentes que assumem dados globais — todas as páginas atuais continuam funcionando porque tudo vai para "Grupo A3" e o user de teste fica admin lá.
- Volume de código grande; entrego em commits lógicos por sprint dentro da mesma resposta.
