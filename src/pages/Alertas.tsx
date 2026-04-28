import { useCRM, TipoAlerta, Alerta } from "@/store/crm";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ColorBadge } from "@/components/StatusBadge";
import { Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDemandas, useDemandasBootstrap, getResponsaveisIds } from "@/store/demandas";
import { Badge } from "@/components/ui/badge";

const tipoCor: Record<TipoAlerta, string> = {
  Renovacao: "#a855f7",
  Posts_Pendentes: "#f59e0b",
  Contrato_Finalizando: "#ef4444",
  Cliente_Pausado: "#9ca3af",
  Sem_Posts_Ativos: "#f59e0b",
  Posts_Atrasados: "#ef4444",
  Onboarding_Sem_Demanda: "#3b82f6",
  Onboarding_Sem_Post: "#3b82f6",
  Onboarding_Prazo_Vencido: "#ef4444",
};

type AlertaItem = Alerta & {
  _derivado?: boolean;
  _origem?: "POST" | "DEMANDA" | "ONBOARDING";
  /** Rótulo visual do tipo (sobrepõe tipo_alerta para alertas derivados, sem alterar enum DB) */
  _tipoExibicao?: string;
  /** Cor visual do badge */
  _corExibicao?: string;
};

function useAlertasDemandas(): AlertaItem[] {
  useDemandasBootstrap();
  const demandas = useDemandas((s) => s.demandas);
  return useMemo(() => {
    const out: AlertaItem[] = [];
    demandas.forEach((d) => {
      if (d.status === "Atrasado") {
        out.push({
          id: `demanda-atraso:${d.id}`,
          cliente_id: d.cliente_id,
          tipo_alerta: "Posts_Atrasados" as TipoAlerta, // tipo no DB (não usado para exibição)
          data_alerta: new Date().toISOString().slice(0, 10),
          mensagem: `${d.titulo} — atrasada`,
          status: "Pendente",
          created_at: d.updated_at,
          _derivado: true,
          _origem: "DEMANDA",
          _tipoExibicao: "Demandas Atrasadas",
          _corExibicao: "#ef4444",
        });
      }
      if (d.prioridade === "Urgente" && getResponsaveisIds(d).length === 0 && d.status !== "Concluido") {
        out.push({
          id: `demanda-urgente:${d.id}`,
          cliente_id: d.cliente_id,
          tipo_alerta: "Posts_Pendentes" as TipoAlerta,
          data_alerta: new Date().toISOString().slice(0, 10),
          mensagem: `${d.titulo} — urgente sem responsável`,
          status: "Pendente",
          created_at: d.created_at,
          _derivado: true,
          _origem: "DEMANDA",
          _tipoExibicao: "Demandas Sem Responsável",
          _corExibicao: "#f59e0b",
        });
      }
    });
    return out;
  }, [demandas]);
}

function useAlertasDerivados(): AlertaItem[] {
  const { clientes, cards } = useCRM();
  const demandas = useDemandas((s) => s.demandas);
  return useMemo(() => {
    const out: AlertaItem[] = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const mk = (tipo: TipoAlerta, cliente_id: string, mensagem: string): AlertaItem => ({
      id: `derivado:${tipo}:${cliente_id}`,
      cliente_id,
      tipo_alerta: tipo,
      data_alerta: new Date().toISOString().slice(0, 10),
      mensagem,
      status: "Pendente",
      created_at: new Date().toISOString(),
      _derivado: true,
    });
    clientes.forEach((c) => {
      if (c.data_fim_contrato) {
        const fim = new Date(c.data_fim_contrato);
        const dias = Math.ceil((fim.getTime() - hoje.getTime()) / 86400000);
        if (dias >= 0 && dias <= 7) out.push(mk("Renovacao", c.id, `Renovação em ${dias} dia(s)`));
      }
      if (c.status_cliente === "Pausado") {
        out.push(mk("Cliente_Pausado", c.id, "Cliente em pausa"));
      }
      const meusCards = cards.filter((k) => k.cliente_id === c.id);
      const ativos = meusCards.filter((k) => k.status_card !== "Postado" && k.status_card !== "Atrasado");
      if (meusCards.length > 0 && ativos.length === 0 && c.status_cliente !== "Encerrado") {
        out.push(mk("Sem_Posts_Ativos", c.id, "Sem posts em andamento"));
      }
      const atrasados = meusCards.filter((k) => k.status_card === "Atrasado");
      if (atrasados.length > 0) {
        out.push(mk("Posts_Atrasados", c.id, `${atrasados.length} post(s) atrasado(s)`));
      }

      // [ONBOARDING] alertas para clientes em fase de onboarding
      if ((c.status_global ?? "Onboarding") === "Onboarding") {
        const temDemanda = demandas.some((d) => d.cliente_id === c.id);
        if (!temDemanda) {
          out.push(mk("Onboarding_Sem_Demanda", c.id, "[ONBOARDING] Cliente sem demanda criada"));
        }
        const temPostIniciado = meusCards.some((k) => k.status_card !== "Planejamento");
        if (!temPostIniciado) {
          out.push(mk("Onboarding_Sem_Post", c.id, "[ONBOARDING] Cliente sem post iniciado"));
        }
        if (c.prazo_onboarding) {
          const prazo = new Date(c.prazo_onboarding);
          if (prazo < hoje) {
            out.push(mk("Onboarding_Prazo_Vencido", c.id, "[ONBOARDING] Prazo de ativação vencido"));
          }
        }
      }
    });
    return out;
  }, [clientes, cards, demandas]);
}

function Tabela({ status }: { status: "Pendente" | "Resolvido" }) {
  const { alertas, clientes, resolverAlerta, _loadAll } = useCRM();
  const { canWrite } = useAuth();
  const derivados = useAlertasDerivados();
  const derivadosDemandas = useAlertasDemandas();
  const [resolvendo, setResolvendo] = useState<string | null>(null);

  // Chave de "resolvido" para alertas derivados: usamos linhas em `alertas`
  // com status=Resolvido cujo `mensagem` corresponde ao do derivado.
  const resolvidosKeys = useMemo(() => {
    const set = new Set<string>();
    alertas.filter((a) => a.status === "Resolvido").forEach((a) => set.add(`${a.cliente_id}|${a.tipo_alerta}|${a.mensagem}`));
    return set;
  }, [alertas]);

  const items: AlertaItem[] = useMemo(() => {
    if (status === "Pendente") {
      const persistidos = alertas.filter((a) => a.status === "Pendente");
      const derivadosVisiveis = derivados.filter(
        (d) => !resolvidosKeys.has(`${d.cliente_id}|${d.tipo_alerta}|${d.mensagem}`),
      );
      return [...persistidos, ...derivadosVisiveis, ...derivadosDemandas];
    }
    return alertas.filter((a) => a.status === "Resolvido");
  }, [status, alertas, derivados, derivadosDemandas, resolvidosKeys]);

  const onResolver = async (a: AlertaItem) => {
    setResolvendo(a.id);
    try {
      if (a._derivado) {
        const { error } = await supabase.from("alertas").insert({
          cliente_id: a.cliente_id,
          tipo_alerta: a.tipo_alerta as any,
          mensagem: a.mensagem,
          status: "Resolvido" as any,
          data_alerta: a.data_alerta,
        });
        if (error) throw error;
        await _loadAll();
        toast.success("Alerta resolvido");
      } else {
        await resolverAlerta(a.id);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao resolver alerta");
    } finally {
      setResolvendo(null);
    }
  };

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
                <td className="px-4 py-2.5"><ColorBadge label={a.tipo_alerta.replace(/_/g, " ")} color={tipoCor[a.tipo_alerta]} /></td>
                <td className="px-4 py-2.5"><Link to={`/clientes/${a.cliente_id}`} className="text-primary hover:underline">{cli?.nome_cliente}</Link></td>
                <td className="px-4 py-2.5 text-muted-foreground">{new Date(a.data_alerta).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className="text-[10px] mr-2 font-mono">
                    {a._origem === "DEMANDA"
                      ? "[DEMANDA]"
                      : a.tipo_alerta.startsWith("Onboarding_")
                        ? "[ONBOARDING]"
                        : "[POST]"}
                  </Badge>
                  {a.mensagem}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {status === "Pendente" && canWrite && (
                    <Button size="sm" variant="outline" disabled={resolvendo === a.id} onClick={() => onResolver(a)}>
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
        <p className="text-sm text-muted-foreground">Renovações, clientes pausados, posts atrasados e contratos finalizando</p>
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
