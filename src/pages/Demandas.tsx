import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Zap } from "lucide-react";
import { useDemandas, useDemandasBootstrap, Demanda } from "@/store/demandas";
import { useCRM } from "@/store/crm";
import { useAuth } from "@/hooks/useAuth";
import { DemandasKanban } from "@/components/demandas/DemandasKanban";
import { DemandCard } from "@/components/demandas/DemandCard";
import { NovaDemandaDialog } from "@/components/demandas/NovaDemandaDialog";
import { DemandaRapidaDialog } from "@/components/demandas/DemandaRapidaDialog";
import { DemandaDetalheDialog } from "@/components/demandas/DemandaDetalheDialog";
import { RelatoriosDemandas } from "@/components/demandas/RelatoriosDemandas";
import { ClientesDemandasTable } from "@/components/demandas/ClientesDemandasTable";
import {
  CATEGORIAS, CATEGORIA_LABEL, PRIORIDADES, PRIORIDADE_LABEL,
  STATUS_DEMANDA, STATUS_DEMANDA_LABEL,
} from "@/lib/demandas-categorias";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";

type FiltroRapido = "todas" | "hoje" | "atrasadas" | "semana";

export default function Demandas() {
  useDemandasBootstrap();
  const demandas = useDemandas((s) => s.demandas);
  const { clientes, responsaveis } = useCRM();
  const { user } = useAuth();

  const [novaOpen, setNovaOpen] = useState(false);
  const [rapidaOpen, setRapidaOpen] = useState(false);
  const [selecionada, setSelecionada] = useState<Demanda | null>(null);

  const [busca, setBusca] = useState("");
  const [fCliente, setFCliente] = useState<string>("todos");
  const [fResp, setFResp] = useState<string>("todos");
  const [fCat, setFCat] = useState<string>("todas");
  const [fPrio, setFPrio] = useState<string>("todas");
  const [fStatus, setFStatus] = useState<string>("todos");
  const [fRapido, setFRapido] = useState<FiltroRapido>("todas");
  const [calMonth, setCalMonth] = useState<Date>(new Date());

  const filtradas = useMemo(() => {
    const hojeIni = new Date(); hojeIni.setHours(0, 0, 0, 0);
    const hojeFim = new Date(); hojeFim.setHours(23, 59, 59, 999);
    const semana = new Date(); semana.setDate(semana.getDate() + 7);

    return demandas.filter((d) => {
      if (busca && !d.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
      if (fCliente !== "todos" && d.cliente_id !== fCliente) return false;
      if (fResp !== "todos" && d.responsavel_id !== fResp) return false;
      if (fCat !== "todas" && d.categoria !== fCat) return false;
      if (fPrio !== "todas" && d.prioridade !== fPrio) return false;
      if (fStatus !== "todos" && d.status !== fStatus) return false;
      if (fRapido === "atrasadas" && d.status !== "Atrasado") return false;
      if (fRapido === "hoje") {
        if (!d.data_limite) return false;
        const dl = new Date(d.data_limite);
        if (dl < hojeIni || dl > hojeFim) return false;
      }
      if (fRapido === "semana") {
        if (!d.data_limite) return false;
        const dl = new Date(d.data_limite);
        if (dl < hojeIni || dl > semana) return false;
      }
      return true;
    });
  }, [demandas, busca, fCliente, fResp, fCat, fPrio, fStatus, fRapido]);

  const minhas = useMemo(
    () => filtradas.filter((d) => d.responsavel_id && d.responsavel_id === user?.id),
    [filtradas, user]
  );

  const novasSolicitacoes = useMemo(() => {
    const limite = Date.now() - 48 * 60 * 60 * 1000;
    return filtradas.filter(
      (d) => d.status === "Planejamento" || new Date(d.created_at).getTime() > limite
    );
  }, [filtradas]);

  const datasComDemanda = useMemo(() => {
    const map = new Map<string, number>();
    filtradas.forEach((d) => {
      if (!d.data_limite) return;
      const k = new Date(d.data_limite).toDateString();
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return map;
  }, [filtradas]);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Demandas</h1>
          <p className="text-sm text-muted-foreground">
            Tarefas operacionais por cliente — separadas dos posts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRapidaOpen(true)}>
            <Zap className="h-4 w-4 mr-1" /> Rápida
          </Button>
          <Button size="sm" onClick={() => setNovaOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Demanda
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título..."
            className="w-56 h-9"
          />
          <Select value={fCliente} onValueChange={setFCliente}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos clientes</SelectItem>
              {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fResp} onValueChange={setFResp}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos responsáveis</SelectItem>
              {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fCat} onValueChange={setFCat}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fPrio} onValueChange={setFPrio}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas prioridades</SelectItem>
              {PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {STATUS_DEMANDA.map((s) => <SelectItem key={s} value={s}>{STATUS_DEMANDA_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-1 ml-auto">
            {(["todas", "hoje", "atrasadas", "semana"] as FiltroRapido[]).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={fRapido === f ? "default" : "outline"}
                onClick={() => setFRapido(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="quadro">
        <TabsList>
          <TabsTrigger value="quadro">Quadro Geral</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="minhas">Minhas Demandas</TabsTrigger>
          <TabsTrigger value="novas">Novas Solicitações</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="quadro" className="mt-4">
          <DemandasKanban demandas={filtradas} onOpen={setSelecionada} />
        </TabsContent>

        <TabsContent value="clientes" className="mt-4">
          <ClientesDemandasTable />
        </TabsContent>

        <TabsContent value="minhas" className="mt-4">
          {minhas.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma demanda atribuída a você
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2 items-start">
              {minhas.map((d) => (
                <DemandCard key={d.id} demanda={d} onClick={() => setSelecionada(d)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="novas" className="mt-4">
          {novasSolicitacoes.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma nova solicitação
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2 items-start">
              {novasSolicitacoes.map((d) => (
                <DemandCard key={d.id} demanda={d} onClick={() => setSelecionada(d)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendario" className="mt-4">
          <Card>
            <CardContent className="p-4 flex flex-col md:flex-row gap-6">
              <Calendar
                mode="single"
                month={calMonth}
                onMonthChange={setCalMonth}
                modifiers={{
                  hasDemand: (date) => datasComDemanda.has(date.toDateString()),
                }}
                modifiersStyles={{
                  hasDemand: { fontWeight: 700, textDecoration: "underline", color: "hsl(var(--primary))" },
                }}
              />
              <div className="flex-1 max-h-96 overflow-y-auto">
                <div className="text-xs text-muted-foreground mb-2">
                  Demandas com data limite no mês:
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2 items-start">
                  {filtradas
                    .filter((d) => d.data_limite && new Date(d.data_limite).getMonth() === calMonth.getMonth() && new Date(d.data_limite).getFullYear() === calMonth.getFullYear())
                    .sort((a, b) => +new Date(a.data_limite!) - +new Date(b.data_limite!))
                    .map((d) => (
                      <DemandCard key={d.id} demanda={d} onClick={() => setSelecionada(d)} />
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relatorios" className="mt-4">
          <RelatoriosDemandas />
        </TabsContent>
      </Tabs>

      <NovaDemandaDialog open={novaOpen} onOpenChange={setNovaOpen} />
      <DemandaRapidaDialog open={rapidaOpen} onOpenChange={setRapidaOpen} />
      <DemandaDetalheDialog
        demanda={selecionada}
        onOpenChange={(v) => !v && setSelecionada(null)}
      />
    </div>
  );
}
