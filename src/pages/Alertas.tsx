import { useCRM, TipoAlerta } from "@/store/crm";
import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ColorBadge } from "@/components/StatusBadge";
import { Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const tipoCor: Record<TipoAlerta, string> = {
  Renovacao: "#a855f7",
  Posts_Pendentes: "#f59e0b",
  Contrato_Finalizando: "#ef4444",
};

function Tabela({ status }: { status: "Pendente" | "Resolvido" }) {
  const { alertas, clientes, resolverAlerta } = useCRM();
  const { canWrite } = useAuth();
  const items = alertas.filter((a) => a.status === status);
  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground">Tipo</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground">Cliente</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground">Data</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground">Mensagem</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">Nenhum alerta</td></tr>
          )}
          {items.map((a) => {
            const cli = clientes.find((c) => c.id === a.cliente_id);
            return (
              <tr key={a.id} className="border-t hover:bg-accent/30">
                <td className="px-4 py-2.5"><ColorBadge label={a.tipo_alerta.replace("_", " ")} color={tipoCor[a.tipo_alerta]} /></td>
                <td className="px-4 py-2.5"><Link to={`/clientes/${a.cliente_id}`} className="text-primary hover:underline">{cli?.nome_cliente}</Link></td>
                <td className="px-4 py-2.5 text-muted-foreground">{new Date(a.data_alerta).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2.5">{a.mensagem}</td>
                <td className="px-4 py-2.5 text-right">
                  {status === "Pendente" && canWrite && (
                    <Button size="sm" variant="outline" onClick={() => resolverAlerta(a.id)}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Resolver
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Alertas() {
  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Alertas</h1>
        <p className="text-sm text-muted-foreground">Renovações, posts pendentes e contratos finalizando</p>
      </div>
      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes" className="mt-4"><Tabela status="Pendente" /></TabsContent>
        <TabsContent value="historico" className="mt-4"><Tabela status="Resolvido" /></TabsContent>
      </Tabs>
    </div>
  );
}
