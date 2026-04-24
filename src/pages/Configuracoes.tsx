import { useCRM } from "@/store/crm";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Plus } from "lucide-react";

export default function Configuracoes() {
  const { theme, toggle } = useTheme();
  const { nichos, statusOptions, addNicho, addStatusOption } = useCRM();
  const [novoNicho, setNovoNicho] = useState("");
  const [novoStatus, setNovoStatus] = useState("");

  return (
    <div className="p-6 space-y-4 max-w-3xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Tema, nichos e status</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Aparência</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Modo escuro</div>
            <div className="text-xs text-muted-foreground">Alterna entre claro e escuro</div>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggle} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Nichos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {nichos.map((n) => (
              <span key={n.label} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border" style={{ backgroundColor: `${n.cor}1f`, color: n.cor, borderColor: `${n.cor}4d` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: n.cor }} /> {n.label}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={novoNicho} onChange={(e) => setNovoNicho(e.target.value)} placeholder="Novo nicho" className="h-9" />
            <Button onClick={() => { if (!novoNicho) return; addNicho({ label: novoNicho, cor: `hsl(${Math.random()*360}, 70%, 50%)` }); setNovoNicho(""); }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Status do Cliente</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border" style={{ backgroundColor: `${s.cor}1f`, color: s.cor, borderColor: `${s.cor}4d` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.cor }} /> {s.label}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)} placeholder="Novo status" className="h-9" />
            <Button onClick={() => { if (!novoStatus) return; addStatusOption({ label: novoStatus, cor: `hsl(${Math.random()*360}, 70%, 50%)` }); setNovoStatus(""); }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
