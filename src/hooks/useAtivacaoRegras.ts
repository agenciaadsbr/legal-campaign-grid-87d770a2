import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AtivacaoRegras } from "@/lib/ativacaoRules";
import { REGRAS_PADRAO } from "@/lib/ativacaoRules";

const REGRAS_FALLBACK: AtivacaoRegras = { id: "fallback", ...REGRAS_PADRAO };

export function useAtivacaoRegras() {
  const [regras, setRegras] = useState<AtivacaoRegras>(REGRAS_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ativacao_regras" as any)
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[ativacao] load regras", error);
      setLoading(false);
      return;
    }
    if (data) setRegras(data as unknown as AtivacaoRegras);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (patch: Partial<Omit<AtivacaoRegras, "id">>) => {
      setSaving(true);
      const { data: userRes } = await supabase.auth.getUser();
      const updated_by = userRes.user?.id ?? null;
      const { data, error } = await supabase
        .from("ativacao_regras" as any)
        .update({ ...patch, updated_at: new Date().toISOString(), updated_by })
        .eq("id", regras.id)
        .select("*")
        .maybeSingle();
      setSaving(false);
      if (error) {
        toast.error("Não foi possível salvar as regras: " + error.message);
        return false;
      }
      if (data) setRegras(data as unknown as AtivacaoRegras);
      toast.success("Regras de ativação atualizadas");
      return true;
    },
    [regras.id],
  );

  return { regras, loading, saving, save, reload: load };
}
