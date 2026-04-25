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

    // 5. Atualiza nome no profile (criado pelo trigger)
    if (body.nome) {
      await adminClient.from("profiles").update({ nome: body.nome }).eq("id", newUserId);
    }

    // 6. Se a role pedida não for editor (default do trigger), substitui
    if (role !== "editor") {
      await adminClient.from("user_roles").delete().eq("user_id", newUserId);
      await adminClient.from("user_roles").insert({ user_id: newUserId, role });
    }

    return json({ ok: true, user_id: newUserId });
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
