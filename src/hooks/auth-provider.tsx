import { useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { clearResponsavelCache } from "@/hooks/responsavelCache";
import { AuthContext, type AppRole } from "@/hooks/auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega roles + valida status ativo (deferred para não bloquear callback de auth)
  const loadUserData = (userId: string) => {
    setTimeout(async () => {
      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("ativo").eq("id", userId).maybeSingle(),
      ]);

      // Bloqueia inativos
      if (profileRes.data && profileRes.data.ativo === false) {
        toast.error("Conta desativada", {
          description: "Entre em contato com o administrador.",
        });
        await supabase.auth.signOut();
        return;
      }

      setRoles(((rolesRes.data ?? []) as { role: AppRole }[]).map((r) => r.role));
    }, 0);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        loadUserData(newSession.user.id);
      } else {
        setRoles([]);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) loadUserData(data.session.user.id);
      })
      .catch((err) => {
        console.warn("[auth] getSession falhou:", err);
        setSession(null);
        setUser(null);
      })
      .finally(() => setLoading(false));

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    clearResponsavelCache();
    await supabase.auth.signOut();
  };

  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const canWrite = isAdmin || roles.includes("editor");

  return (
    <AuthContext.Provider
      value={{ user, session, roles, loading, isAdmin, canWrite, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}