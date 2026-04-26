import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EquipeAcessosManager } from "@/components/EquipeAcessosManager";
import { MeuPerfil } from "@/components/MeuPerfil";
import { ConfiguracoesDemandasManager } from "@/components/ConfiguracoesDemandasManager";
import { useAuth } from "@/hooks/useAuth";

export default function Configuracoes() {
  const { theme, toggle } = useTheme();
  const { isAdmin } = useAuth();

  return (
    <div className="p-6 space-y-4 max-w-5xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie sua conta, aparência e {isAdmin ? "a equipe que tem acesso ao sistema" : "preferências"}.
        </p>
      </div>

      <Tabs defaultValue={isAdmin ? "equipe" : "perfil"}>
        <TabsList>
          <TabsTrigger value="perfil">Meu perfil</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          {isAdmin && <TabsTrigger value="equipe">Equipe & Acessos</TabsTrigger>}
        </TabsList>

        <TabsContent value="perfil" className="mt-4">
          <MeuPerfil />
        </TabsContent>

        <TabsContent value="aparencia" className="mt-4">
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
        </TabsContent>

        {isAdmin && (
          <TabsContent value="equipe" className="mt-4">
            <EquipeAcessosManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
