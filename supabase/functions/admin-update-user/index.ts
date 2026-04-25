import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "admin" | "editor" | "viewer";

interface UpdateBody {
  user_id: string;
  nome?: string | null;
  cargo?: string | null;
  telefone?: string | null;
  ativo?: boolean;
  role?: Role;
  responsavel_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid token" }, 401);
    const callerId = userData.user.id;

    const { data: isAdmin, error: roleErr } = await callerClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return json({ error: "Apenas administradores podem editar usuários" }, 403);
    }

    const body = (await req.json()) as UpdateBody;
    if (!body?.user_id) return json({ error: "user_id é obrigatório" }, 400);

    const isSelf = body.user_id === callerId;

    // Self-protection: admin não pode rebaixar nem se desativar
    if (isSelf && body.role && body.role !== "admin") {
      return json({ error: "Você não pode alterar seu próprio papel" }, 400);
    }
    if (isSelf && body.ativo === false) {
      return json({ error: "Você não pode desativar a si mesmo" }, 400);
    }

    if (body.role && !["admin", "editor", "viewer"].includes(body.role)) {
      return json({ error: "role inválida" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // 1. profiles
    const profileUpdates: Record<string, unknown> = {};
    if (body.nome !== undefined) profileUpdates.nome = body.nome;
    if (body.cargo !== undefined) profileUpdates.cargo = body.cargo;
    if (body.telefone !== undefined) profileUpdates.telefone = body.telefone;
    if (body.ativo !== undefined) profileUpdates.ativo = body.ativo;
    if (body.responsavel_id !== undefined) {
      profileUpdates.responsavel_id = body.responsavel_id;
    }
    if (Object.keys(profileUpdates).length > 0) {
      const { error: pErr } = await adminClient
        .from("profiles")
        .update(profileUpdates)
        .eq("id", body.user_id);
      if (pErr) return json({ error: pErr.message }, 400);
    }

    // 2. role
    if (body.role) {
      await adminClient.from("user_roles").delete().eq("user_id", body.user_id);
      const { error: rErr } = await adminClient
        .from("user_roles")
        .insert({ user_id: body.user_id, role: body.role });
      if (rErr) return json({ error: rErr.message }, 400);
    }

    // 3. ban / unban no auth para refletir status
    if (body.ativo !== undefined) {
      const ban_duration = body.ativo ? "none" : "876000h"; // ~100 anos
      const { error: bErr } = await adminClient.auth.admin.updateUserById(
        body.user_id,
        // @ts-expect-error: ban_duration é aceito mas não está nos tipos
        { ban_duration },
      );
      if (bErr) return json({ error: bErr.message }, 400);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
