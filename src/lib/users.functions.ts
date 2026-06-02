import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas administradores podem executar esta ação.");
}

async function audit(params: {
  targetUserId: string;
  actorUserId: string;
  action: string;
  details?: Record<string, unknown>;
}) {
  const { data: actor } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", params.actorUserId)
    .maybeSingle();
  await supabaseAdmin.from("user_audit_log").insert({
    target_user_id: params.targetUserId,
    actor_user_id: params.actorUserId,
    actor_email: actor?.email ?? null,
    action: params.action,
    details: params.details ?? null,
  });
}

export const listUsersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);
    return list.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      last_sign_in_at: u.last_sign_in_at,
      banned_until: (u as { banned_until?: string | null }).banned_until ?? null,
    }));
  });

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nome: z.string().min(1),
  role: z.enum(["admin", "manager", "viewer"]),
});

export const createUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    await supabaseAdmin.from("profiles").update({ nome: data.nome }).eq("id", created.user.id);
    await audit({
      targetUserId: created.user.id,
      actorUserId: context.userId,
      action: "criacao",
      details: { email: data.email, nome: data.nome, role: data.role },
    });
    return { id: created.user.id };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1).optional(),
  role: z.enum(["admin", "manager", "viewer"]).optional(),
});

export const updateUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.nome) {
      const { error } = await supabaseAdmin.from("profiles").update({ nome: data.nome }).eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: data.role });
      if (error) throw new Error(error.message);
    }
    await audit({
      targetUserId: data.id,
      actorUserId: context.userId,
      action: "edicao",
      details: { nome: data.nome, role: data.role },
    });
    return { ok: true };
  });

const banSchema = z.object({ id: z.string().uuid(), ativo: z.boolean() });

export const setUserAtivoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => banSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.ativo ? "none" : "876000h",
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ ativo: data.ativo }).eq("id", data.id);
    await audit({
      targetUserId: data.id,
      actorUserId: context.userId,
      action: data.ativo ? "reativacao" : "desativacao",
    });
    return { ok: true };
  });

const passwordSchema = z.object({ id: z.string().uuid(), password: z.string().min(6) });

export const setUserPasswordAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => passwordSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error(error.message);
    await audit({
      targetUserId: data.id,
      actorUserId: context.userId,
      action: "alteracao_senha",
    });
    return { ok: true };
  });

const historySchema = z.object({ id: z.string().uuid() });

export const getUserAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => historySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("user_audit_log")
      .select("id, action, actor_email, details, created_at")
      .eq("target_user_id", data.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
