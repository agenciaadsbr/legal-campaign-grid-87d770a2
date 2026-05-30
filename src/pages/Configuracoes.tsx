import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EquipeAcessosManager } from "@/components/EquipeAcessosManager";
import { MeuPerfil } from "@/components/MeuPerfil";
import { ConfiguracoesDemandasManager } from "@/components/ConfiguracoesDemandasManager";
import { DocumentosGlobaisManager } from "@/components/configuracoes/DocumentosGlobaisManager";
import { ResponsabilidadesEquipeManager } from "@/components/configuracoes/ResponsabilidadesEquipeManager";
import { IAConfigManager } from "@/components/configuracoes/IAConfigManager";
import { EstruturasAutomaticasManager } from "@/components/configuracoes/EstruturasAutomaticasManager";
import { DelegationSettingsManager } from "@/components/configuracoes/DelegationSettingsManager";
import { DocumentacaoSistemaManager } from "@/components/configuracoes/DocumentacaoSistemaManager";
import { useAuth } from "@/hooks/useAuth";

export default function Configuracoes() {
  const { theme, toggle } = useTheme();
  const { isAdmin } = useAuth();

  return (
    <div className="px-5 py-4 space-y-3 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold leading-tight">Configurações</h1>
        <p className="text-xs text-muted-foreground">
          Gerencie sua conta, aparência e {isAdmin ? "a equipe que tem acesso ao sistema" : "preferências"}.
        </p>
      </div>

      <Tabs defaultValue={isAdmin ? "equipe" : "perfil"}>
        <TabsList className="h-8">
          <TabsTrigger value="perfil" className="text-xs h-7">Meu perfil</TabsTrigger>
          <TabsTrigger value="aparencia" className="text-xs h-7">Aparência</TabsTrigger>
          {isAdmin && <TabsTrigger value="equipe" className="text-xs h-7">Equipe & Acessos</TabsTrigger>}
          {isAdmin && <TabsTrigger value="demandas" className="text-xs h-7">Demandas</TabsTrigger>}
          {isAdmin && <TabsTrigger value="documentos" className="text-xs h-7">Documentos</TabsTrigger>}
          {isAdmin && <TabsTrigger value="responsabilidades" className="text-xs h-7">Responsabilidades</TabsTrigger>}
          {isAdmin && <TabsTrigger value="ia" className="text-xs h-7">IA</TabsTrigger>}
          {isAdmin && <TabsTrigger value="delegacao" className="text-xs h-7">Delegação</TabsTrigger>}
          {isAdmin && <TabsTrigger value="estruturas" className="text-xs h-7">Estruturas automáticas</TabsTrigger>}
          {isAdmin && <TabsTrigger value="documentacao" className="text-xs h-7">Documentação</TabsTrigger>}
        </TabsList>

        <TabsContent value="perfil" className="mt-3">
          <MeuPerfil />
        </TabsContent>

        <TabsContent value="aparencia" className="mt-3">
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-sm">Aparência</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between p-4 pt-0">
              <div>
                <div className="text-xs font-medium">Modo escuro</div>
                <div className="text-xs text-muted-foreground">Alterna entre claro e escuro</div>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggle} />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="equipe" className="mt-3">
            <EquipeAcessosManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="demandas" className="mt-3">
            <ConfiguracoesDemandasManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="documentos" className="mt-3">
            <DocumentosGlobaisManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="responsabilidades" className="mt-3">
            <ResponsabilidadesEquipeManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="ia" className="mt-3">
            <IAConfigManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="delegacao" className="mt-3">
            <DelegationSettingsManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="estruturas" className="mt-3">
            <EstruturasAutomaticasManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
