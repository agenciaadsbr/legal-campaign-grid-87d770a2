import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCRM, type Responsavel } from "@/store/crm";
import { responsavelCache as cache, clearResponsavelCache } from "@/hooks/responsavelCache";

export { clearResponsavelCache };

/**
 * Resolve o `Responsavel` (tabela `responsaveis`) que corresponde ao
 * usuário autenticado, navegando por `profiles.responsavel_id`.
 *
 * Cacheado por sessão (memória) — só refaz a consulta quando o auth user muda.
 */

export function useResponsavelAtual(): {
  responsavel: Responsavel | null;
  responsavelId: string | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const responsaveis = useCRM((s) => s.responsaveis);
  const [responsavelId, setResponsavelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user?.id) {
        setResponsavelId(null);
        setLoading(false);
        return;
      }
      if (user.id in cache) {
        setResponsavelId(cache[user.id]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("responsavel_id")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const rid = (data?.responsavel_id as string | null) ?? null;
      cache[user.id] = rid;
      setResponsavelId(rid);
      setLoading(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const responsavel =
    (responsavelId && responsaveis.find((r) => r.id === responsavelId)) || null;

  return { responsavel, responsavelId, loading };
}
