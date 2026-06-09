# Plano — Sprints 9, 10 e 11

Três módulos com escopos bem distintos: auditoria/timeline (puro frontend+SQL), agente local Windows (endpoint público + UI), e descoberta de rede (fila de aprovação alimentada pelo agente).

## Sprint 9 — Auditoria & Timeline Avançada

A maior parte da infra já existe (`movimentacoes`, `manutencoes`, `alertas`, `impressora_leituras`). Falta consolidar, expor e dar pesquisa global.

### Banco
- Triggers de auditoria adicionais:
  - `licencas_software`, `licenca_atribuicoes`, `contratos`, `contrato_documentos`, `empresas`, `fornecedores`, `categorias`, `estoque_consumiveis`, `ativo_garantias` → gravar em nova tabela `audit_log` (global, não específica de ativo).
- Tabela `audit_log`:
  - `id`, `entidade` (text), `entidade_id` (uuid), `acao` (`create|update|delete|restore`), `usuario_id`, `descricao`, `diff` (jsonb opcional), `created_at`.
  - RLS: leitura para `manager`/`admin`; insert via trigger SECURITY DEFINER.
- Função `consumivel_movimentos(_id)` (view) consolidando entradas/saídas a partir de `movimentacoes` tipo `consumivel_entrada|consumivel_saida|consumivel_ajuste` (adicionar novos valores ao enum se faltarem).
- Triggers em `estoque_consumiveis` para registar delta de `quantidade` como movimento.

### Frontend
- `/auditoria` — nova página (admin/manager):
  - Filtros: utilizador, entidade, período, ação.
  - Tabela paginada com link para o recurso.
- `/ativos/$id`: melhorar `<Timeline>` já existente — agrupar por dia, ícone por tipo, badges coloridos, animação suave (framer-motion já não está instalado → usar transições CSS).
- `/impressoras/$id`: novo bloco **Histórico SNMP & Alertas** lendo `impressora_leituras` + `alertas` da impressora.
- `/consumiveis/$id` (ou drawer): aba **Movimentos** com entradas/saídas/ajustes.
- Sidebar: item "Auditoria" sob Configurações (admin/manager).

## Sprint 10 — A3 Agent v1

Agente Windows + endpoint público + UI de monitoramento.

### Banco
- Tabela `agentes`:
  - `id`, `nome`, `hostname`, `chave_hash` (text, hash da chave), `ativo_id` (fk opcional), `empresa_id`, `ultimo_contato`, `online` (bool computado), `notas`.
- Tabela `agente_inventarios`:
  - `agente_id`, `hostname`, `usuario_atual`, `ip`, `so`, `so_versao`, `cpu`, `ram_mb`, `disco_total_gb`, `disco_livre_gb`, `mac`, `coletado_em`.
- Tabela `agente_eventos` (registo de comunicação):
  - `agente_id`, `tipo` (`registro|heartbeat|inventario|erro`), `payload` jsonb, `ip_origem`, `created_at`.
- RLS: leitura para `authenticated`; escrita só `service_role` (via endpoint).
- Função `agente_online(_id)` → `ultimo_contato > now() - interval '5 minutes'`.

### Endpoints públicos (`/api/public/agent/*`)
- `POST /register` — body `{ chave_instalacao, hostname }` → cria/recupera agente, devolve `{ id, token }` (token = chave única hashed).
- `POST /heartbeat` — header `x-agent-token`, body `{ inventario? }` → atualiza `ultimo_contato`, grava inventário se enviado, log em `agente_eventos`.
- Validação Zod, rate limiting básico via verificação de token.
- `INSTALL_KEY` em secrets para `register`.

### Agente local (script PowerShell + serviço)
- `agent/a3-agent.ps1`:
  - Instala como Scheduled Task (`Register-ScheduledTask`) a cada 5 min.
  - Lê config em `C:\ProgramData\A3Agent\config.json` (URL + token).
  - Coleta `Get-ComputerInfo`, `Get-CimInstance Win32_LogicalDisk`, IP via `Get-NetIPAddress`.
  - POST heartbeat.
- `agent/install.ps1` — wizard com chave de instalação.
- Docs em `docs/a3-agent.md`.

### Frontend
- `/a3-agent` — lista de agentes (cards):
  - Estado online/offline (dot verde/cinza), hostname, IP, último contato.
  - Drawer detalhe: inventário corrente + histórico eventos.
  - Botão "Gerar chave de instalação" (admin) → mostra script de install pré-preenchido.
- Sidebar item "A3 Agent" sob Sistema.

## Sprint 11 — Descoberta Automática

Reaproveita o agente: ele faz scan da subnet local e reporta. Sem scanner server-side (Workers não fazem TCP arbitrário).

### Banco
- Tabela `dispositivos_descobertos`:
  - `id`, `agente_id` (quem reportou), `ip`, `mac`, `hostname`, `fabricante`, `modelo`, `tipo_sugerido` (printer/computer/switch/router/ap/unknown), `portas_abertas` int[], `descoberto_em`, `estado` (`novo|ignorado|aprovado`), `ativo_id` (preenchido ao aprovar), `empresa_id`, `categoria_id`.
- Deduplicação por `(mac)` ou `(agente_id, ip)`.

### Endpoint
- `POST /api/public/agent/discovery` — body `{ dispositivos: [...] }` (header `x-agent-token`).
  - Upsert por MAC; mantém `estado='novo'` se ainda não decidido.

### Agente
- Estende `a3-agent.ps1`:
  - `arp -a` + ping sweep da subnet.
  - SNMP get de sysDescr/sysName quando porta 161 aberta (módulo opcional).
  - Reporta a cada 1h.

### Frontend
- `/descoberta` (admin/manager):
  - Tabela com filtro por estado, agente, tipo.
  - Ações: **Aprovar** (abre drawer pré-preenchendo cadastro de ativo — categoria/empresa selecionáveis, cria ativo + atualiza `estado='aprovado'`) ou **Ignorar**.
  - KPIs topo: novos, ignorados, aprovados hoje.
- Sidebar: "Descoberta".
- Dashboard: bloco "Descoberta de rede" — novos pendentes.

## Ordem de execução
1. Migração única (Sprints 9+10+11): `audit_log`, triggers, `agentes`, `agente_inventarios`, `agente_eventos`, `dispositivos_descobertos`, enums, funções, RLS, GRANTs.
2. Aguardar types regen.
3. Endpoints públicos do agente.
4. UI Sprint 9 (auditoria, timelines, históricos).
5. UI Sprint 10 (A3 Agent).
6. Script PowerShell + docs.
7. UI Sprint 11 (descoberta).
8. Atualizar sidebar e dashboard.

## Fora de escopo (confirmado)
- Logs técnicos do SO / SIEM.
- Controle remoto, execução de comandos, gestão de software no agente.
- Scanner server-side (não viável no runtime Worker; o agente é o único scanner).
- Alterações automáticas sem aprovação na descoberta.
