import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ESTRATEGIAS_CONFIG,
  type EstrategiaId,
  type EstrategiaStatus,
} from "@/lib/estrategiasAtivas";

interface Props {
  value: Partial<Record<EstrategiaId, EstrategiaStatus>>;
  onChange: (next: Record<EstrategiaId, EstrategiaStatus>) => void;
}

const OPCOES: { value: EstrategiaStatus; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "pendente", label: "Pendente" },
  { value: "nao_usar", label: "Não usar" },
];

export function EstrategiasConfigEditor({ value, onChange }: Props) {
  const current: Record<EstrategiaId, EstrategiaStatus> = {
    meta_ads: value.meta_ads ?? "nao_usar",
    google_ads: value.google_ads ?? "nao_usar",
    posts: value.posts ?? "nao_usar",
    gmn: value.gmn ?? "nao_usar",
    crm: value.crm ?? "nao_usar",
  };

  const setItem = (id: EstrategiaId, v: EstrategiaStatus) => {
    onChange({ ...current, [id]: v });
  };

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
      <div>
        <Label className="text-sm">Estratégia Ativa</Label>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Configure quais frentes operacionais estão ativas para este cliente.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ESTRATEGIAS_CONFIG.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2">
            <Label className="text-xs font-normal text-foreground/80">{e.label}</Label>
            <Select
              value={current[e.id]}
              onValueChange={(v) => setItem(e.id, v as EstrategiaStatus)}
            >
              <SelectTrigger className="h-7 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPCOES.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
