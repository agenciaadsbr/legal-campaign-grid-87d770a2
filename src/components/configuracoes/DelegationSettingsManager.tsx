import { useState, useEffect } from "react";
import { useCRM } from "@/store/crm";
import { useDelegations } from "@/store/delegations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck, Users, Clock, Settings2 } from "lucide-react";
import { toast } from "sonner";

export function DelegationSettingsManager() {
  const { responsaveis } = useCRM();
  const { config, loadConfig, updateConfig } = useDelegations();
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  
  const [authorizedIds, setAuthorizedIds] = useState<string[]>([]);
  const [prazoPadrao, setPrazoPadrao] = useState(1);
  const [tiposAuto, setTiposAuto] = useState<string[]>([]);
  const [responsavelPadrao, setResponsavelPadrao] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      if (!config) {
        await loadConfig();
      }
      setInitLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (config) {
      setAuthorizedIds(config.usuarios_autorizados_ids || []);
      setPrazoPadrao(config.prazo_padrao_dias || 1);
      setTiposAuto(config.tipos_sugestao_automatica || []);
      setResponsavelPadrao(config.responsavel_padrao_id || "");
    }
  }, [config]);

  const handleSave = async () => {
    setLoading(true);
    await updateConfig({
      usuarios_autorizados_ids: authorizedIds,
      prazo_padrao_dias: prazoPadrao,
      tipos_sugestao_automatica: tiposAuto,
      responsavel_padrao_id: responsavelPadrao === "" ? null : responsavelPadrao,
    });
    setLoading(false);
  };

  const toggleUser = (id: string) => {
    setAuthorizedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleTipo = (tipo: string) => {
    setTiposAuto(prev => 
      prev.includes(tipo) ? prev.filter(x => x !== tipo) : [...prev, tipo]
    );
  };

  if (initLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Nenhuma configuração de delegação encontrada.
        </CardContent>
      </Card>
    );
  }

  const tiposDisponiveis = ["Performance", "Estratégia", "Onboarding", "Alinhamento", "Kickoff", "Check-in"];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Permissões de Delegação
          </CardTitle>
          <CardDescription>Defina quem pode receber e gerenciar alertas de delegação de reuniões.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuários autorizados a delegar</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3 border rounded-md bg-muted/20">
              {responsaveis.map((r) => (
                <div key={r.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`user-${r.id}`} 
                    checked={authorizedIds.includes(r.id)} 
                    onCheckedChange={() => toggleUser(r.id)}
                  />
                  <Label htmlFor={`user-${r.id}`} className="text-sm font-normal cursor-pointer">{r.nome}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Prazo padrão (dias úteis)
              </Label>
              <Input 
                type="number" 
                min={1} 
                max={30} 
                value={prazoPadrao} 
                onChange={(e) => setPrazoPadrao(parseInt(e.target.value) || 1)} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Responsável padrão
              </Label>
              <Select value={responsavelPadrao || "__none__"} onValueChange={(v) => setResponsavelPadrao(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {responsaveis.filter(r => authorizedIds.includes(r.id)).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Settings2 className="h-3 w-3" /> Tipos de reunião para sugestão automática
            </Label>
            <div className="flex flex-wrap gap-3 p-3 border rounded-md bg-muted/20">
              {tiposDisponiveis.map((tipo) => (
                <div key={tipo} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`tipo-${tipo}`} 
                    checked={tiposAuto.includes(tipo)} 
                    onCheckedChange={() => toggleTipo(tipo)}
                  />
                  <Label htmlFor={`tipo-${tipo}`} className="text-sm font-normal cursor-pointer">{tipo}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
