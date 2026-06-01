## Sprint de Consolidação — Asset Companion (Grupo A3)

Objetivo: elevar o sistema para uso interno robusto sem adicionar módulos novos. Foco em estabilidade, responsividade e UX.

---

### 1. Gestão completa de utilizadores (`/usuarios`)

Reescrever a página atual para incluir:
- **Listagem** com nome, email, papel, status (ativo/inativo) e último acesso.
- **Criar utilizador** (modal): nome, email, senha temporária, papel. Usa `supabase.auth.admin.createUser` via server function com `supabaseAdmin` + `requireSupabaseAuth` (verifica papel admin).
- **Editar utilizador**: nome e papel.
- **Desativar / Reativar**: usa `supabase.auth.admin.updateUserById({ ban_duration })`. Adicionar coluna `ativo` em `profiles` para refletir status na UI.
- **Alterar senha**: admin define nova senha via server function (`updateUserById`).
- **Último acesso**: ler `last_sign_in_at` do auth via server function admin (retorna mapa userId→timestamp).

Server functions em `src/lib/users.functions.ts`, todas protegidas e validando `has_role(uid,'admin')` no handler.

### 2. Responsividade total

- `AppSidebar`: já usa shadcn — confirmar `collapsible="icon"` em tablet e `offcanvas` em mobile.
- `Topbar`: adicionar `<SidebarTrigger />` sempre visível (hamburger em mobile).
- `_authenticated.tsx`: envolver em `SidebarProvider` com `defaultOpen` responsivo; remover layout flex manual conflitante.
- Formulários (`ativos.novo`, `impressoras.novo`, `fornecedores`, etc.): grids `grid-cols-1 md:grid-cols-2`, inputs `w-full`, modais `max-w-[95vw]`.
- Tabelas: wrapper `overflow-x-auto` em todas as listas.

### 3. QR Code funcional

- Etiqueta gera QR apontando para `${origin}/ativos/{id}` (já é rota existente).
- Garantir rota pública de leitura: ao escanear, se logado abre detalhes; se não, redireciona para login com `redirect` param.
- Adicionar botão "Imprimir etiqueta PDF" em `/ativos/$id` que abre `/etiquetas?ids=<id>` em modo print (window.print com CSS print).
- CSS print já existente em `etiquetas.tsx` — adicionar `@media print` para esconder sidebar/topbar.

### 4. Layout fixo

- `_authenticated.tsx`: usar `h-screen overflow-hidden` no container; sidebar `fixed` em desktop via shadcn; main com `flex-1 overflow-hidden flex flex-col`; conteúdo com `flex-1 overflow-y-auto`.
- Topbar `sticky top-0 z-40` com `border-b bg-background`.
- Remover paddings/rolagens duplicadas.

### 5. Configurações funcionais

Criar `/configuracoes` (tabs):
- **Organização**: nome do grupo (config simples em tabela `configuracoes` k/v) e tema.
- **Empresas**: link para `/empresas`.
- **Inventário**: estoque mínimo padrão, prefixos.
- **Alertas**: thresholds toner crítico/baixo, papel baixo (persistidos em `configuracoes`).
- **Impressoras**: intervalo SNMP, comunidade padrão.

Nova tabela `configuracoes (chave text pk, valor jsonb, updated_at)` com RLS (admin escreve, autenticado lê).

### 6. UX

- Substituir todas as listas "vazias" por componente `<EmptyState icon title description action />`.
- Skeletons em vez de "Carregando..." (usar `<Skeleton />` shadcn).
- Toasts padronizados (`toast.success`, `toast.error` com mensagem do backend).
- Botões com estado `loading` (spinner + disabled).
- Mensagens de erro de Supabase traduzidas para PT quando comuns.

---

### Arquivos principais a criar/editar

**Novos:**
- `src/lib/users.functions.ts` — server fns admin.
- `src/components/empty-state.tsx`
- `src/routes/_authenticated/configuracoes.tsx`
- Migração: coluna `profiles.ativo` (bool default true), tabela `configuracoes`.

**Editar:**
- `src/routes/_authenticated.tsx` — layout fixo + SidebarProvider corretamente.
- `src/components/topbar.tsx` — SidebarTrigger + sticky.
- `src/components/app-sidebar.tsx` — confirmar collapsible responsivo.
- `src/routes/_authenticated/usuarios.tsx` — CRUD completo.
- `src/routes/_authenticated/ativos.$id.tsx` — botão imprimir etiqueta + ajustes mobile.
- `src/routes/_authenticated/etiquetas.tsx` — CSS print, leitura de `?ids=`.
- `src/components/app-sidebar.tsx` — link "Configurações".

### Observações técnicas

- Server fns admin requerem `attachSupabaseAuth` (já configurado) + verificação `has_role('admin')` no handler antes de usar `supabaseAdmin`.
- QR já é gerado por `qrcode` em `etiquetas.tsx` — apenas garantir URL correta.
- Não criar novos módulos de negócio.