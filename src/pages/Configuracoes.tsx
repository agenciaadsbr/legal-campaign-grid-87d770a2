import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { EquipeAcessosManager } from "@/components/EquipeAcessosManager";

export default function Configuracoes() {
  const { theme, toggle } = useTheme();

  return (
    <div className="p-6 space-y-4 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie a aparência e a equipe que tem acesso ao sistema.
        </p>
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

      <EquipeAcessosManager />
    </div>
  );
}
