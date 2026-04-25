import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function Configuracoes() {
  const { theme, toggle } = useTheme();

  return (
    <div className="p-6 space-y-4 max-w-3xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie a aparência. Status, nichos e responsáveis foram movidos para o botão de configurações da página Clientes.
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
    </div>
  );
}
