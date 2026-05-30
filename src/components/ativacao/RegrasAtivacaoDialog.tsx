import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { useAtivacaoRegras } from "@/hooks/useAtivacaoRegras";
import { useAuth } from "@/hooks/useAuth";
import type { AtivacaoRegras } from "@/lib/ativacaoRules";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const FLAGS: { key: keyof Omit<AtivacaoRegras, "id" | "modo_regra" | "quantidade_minima">; label: string }[] = [
  { key: "requer_meta_ads", label: "Meta Ads ativo" },
  { key: "requer_google_ads", label: "Google Ads ativo" },
  { key: "requer_posts", label: "Posts ativos" },
  { key: "requer_crm", label: "CRM / IA ativo" },
  { key: "requer_lp", label: "Landing page publicada" },
  { key: "requer_gmn", label: "GMN criado" },
  { key: "requer_reuniao_performance", label: "Reunião de performance agendada" },
  { key: "requer_checklist", label: "Checklist de onboarding concluído" },
];

export function RegrasAtivacaoDialog({ open, onOpenChange }: Props) {
  const { regras, save, saving } = useAtivacaoRegras();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const [draft, setDraft] = useState<AtivacaoRegras>(regras);

  useEffect(() => setDraft(regras), [regras, open]);

  const set = <K extends keyof AtivacaoRegras>(k: K, v: AtivacaoRegras[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleSave = async () => {
    const ok = await save({
      requer_meta_ads: draft.requer_meta_ads,
      requer_google_ads: draft.requer_google_ads,
      requer_posts: draft.requer_posts,
      requer_crm: draft.requer_crm,
      requer_lp: draft.requer_lp,
      requer_gmn: draft.requer_gmn,
      requer_reuniao_performance: draft.requer_reuniao_performance,
      requer_checklist: draft.requer_checklist,
      modo_regra: draft.modo_regra,
      quantidade_minima: draft.quantidade_minima,
    });
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Regras de Ativação</DialogTitle>
          <DialogDescription>
            Defina quando um cliente em onboarding pode ser marcado como Ativo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Condições</Label>
            <div className="space-y-2 rounded-md border border-border p-3">
              {FLAGS.map((f) => (
                <div key={f.key} className="flex items-center justify-between">
                  <Label htmlFor={f.key} className="text-sm">{f.label}</Label>
                  <Switch
                    id={f.key}
                    checked={draft[f.key]}
                    onCheckedChange={(v) => set(f.key, v)}
                    disabled={!isAdmin}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Modo</Label>
            <RadioGroup
              value={draft.modo_regra}
              onValueChange={(v) => set("modo_regra", v as "todas" | "minimo")}
              disabled={!isAdmin}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="todas" id="m-todas" />
                <Label htmlFor="m-todas" className="text-sm">Exigir TODAS as condições marcadas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="minimo" id="m-minimo" />
                <Label htmlFor="m-minimo" className="text-sm">Exigir pelo menos</Label>
                <Input
                  type="number"
                  min={1}
                  className="h-7 w-16"
                  value={draft.quantidade_minima}
                  disabled={draft.modo_regra !== "minimo" || !isAdmin}
                  onChange={(e) => set("quantidade_minima", Math.max(1, Number(e.target.value) || 1))}
                />
                <span className="text-sm text-muted-foreground">condições</span>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!isAdmin || saving}>
            {saving ? "Salvando..." : "Salvar regras"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
