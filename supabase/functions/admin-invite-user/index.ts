import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "admin" | "editor" | "viewer";

interface InviteBody {
  email: string;
  password: string;
  nome?: string;
  role?: Role;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Cliente do CALLER (valida quem está chamando)
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Invalid token" }, 401);
    }
    const callerId = userData.user.id;

    // 2. Verifica se caller é admin
    const { data: isAdmin, error: roleErr } = await callerClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return json({ error: "Apenas administradores podem convidar usuários" }, 403);
    }

    // 3. Valida body
    const body = (await req.json()) as InviteBody;
    if (!body?.email || !body?.password) {
      return json({ error: "email e password são obrigatórios" }, 400);
    }
    if (body.password.length < 6) {
      return json({ error: "Senha precisa ter pelo menos 6 caracteres" }, 400);
    }
    const role: Role = body.role ?? "editor";
    if (!["admin", "editor", "viewer"].includes(role)) {
      return json({ error: "role inválida" }, 400);
    }

    // 4. Cria usuário com service role (auto-confirma email)
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { nome: body.nome ?? null },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "Falha ao criar usuário" }, 400);
    }

    const newUserId = created.user.id;

    // 5. Resolve/cria o responsável vinculado (idempotente por e-mail)
    let responsavelId: string | null = null;
    try {
      const emailLower = body.email.trim().toLowerCase();

      const { data: existente } = await adminClient
        .from("responsaveis")
        .select("id,email")
        .ilike("email", emailLower)
        .maybeSingle();

      if (existente?.id) {
        responsavelId = existente.id as string;
      } else {
        // Cor consistente e distinta das já utilizadas
        const PALETA = [
          "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
          "#ec4899", "#14b8a6", "#f97316", "#22c55e", "#3b82f6", "#a855f7",
        ];
        const { data: todos } = await adminClient.from("responsaveis").select("cor");
        const usadas = new Set((todos ?? []).map((r: { cor: string | null }) => (r.cor ?? "").toLowerCase()));
        const cor = PALETA.find((c) => !usadas.has(c)) ?? PALETA[(todos?.length ?? 0) % PALETA.length];

        const { data: novoResp, error: respErr } = await adminClient
          .from("responsaveis")
          .insert({
            nome: body.nome?.trim() || body.email.split("@")[0],
            email: body.email.trim(),
            cor,
            permissao: role,
          })
          .select("id")
          .single();
        if (respErr) throw respErr;
        responsavelId = novoResp.id as string;
      }
    } catch (e) {
      console.error("Falha ao resolver responsável:", (e as Error).message);
    }

    // 6. Atualiza profile (nome criado pelo trigger + vínculo)
    const profilePatch: Record<string, unknown> = {};
    if (body.nome) profilePatch.nome = body.nome;
    if (responsavelId) profilePatch.responsavel_id = responsavelId;
    if (Object.keys(profilePatch).length > 0) {
      await adminClient.from("profiles").update(profilePatch).eq("id", newUserId);
    }

    // 7. Se a role pedida não for editor (default do trigger), substitui
    if (role !== "editor") {
      await adminClient.from("user_roles").delete().eq("user_id", newUserId);
      await adminClient.from("user_roles").insert({ user_id: newUserId, role });
    }

    return json({ ok: true, user_id: newUserId, responsavel_id: responsavelId });

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
