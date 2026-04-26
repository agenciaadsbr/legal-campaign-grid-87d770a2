import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useDemandas, useDemandasBootstrap, Demanda } from "@/store/demandas";
import { useCRM } from "@/store/crm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus } from "lucide-react";
import { ProjetoKanban } from "@/components/demandas/ProjetoKanban";
import { NovaDemandaDialog } from "@/components/demandas/NovaDemandaDialog";
import { DemandaDetalheDialog } from "@/components/demandas/DemandaDetalheDialog";
import {
  CATEGORIAS,
  CATEGORIA_LABEL,
  PRIORIDADES,
  PRIORIDADE_LABEL,
} from "@/lib/demandas-categorias";

export default function ProjetoDemandasCliente() {
  useDemandasBootstrap();
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  const demandas = useDemandas((s) => s.demandas);
  const { clientes, responsaveis } = useCRM();

  const cliente = clientes.find((c) => c.id === clienteId);

  const [novaOpen, setNovaOpen] = useState(false);
  const [selecionada, setSelecionada] = useState<Demanda | null>(null);

  const [busca, setBusca] = useState("");
  const [fResp, setFResp] = useState("todos");
  const [fPrio, setFPrio] = useState("todas");
  const [fCat, setFCat] = useState("todas");

  const filtradas = useMemo(() => {
    return demandas.filter((d) => {
      if (d.cliente_id !== clienteId) return false;
      if (busca && !d.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
      if (fResp !== "todos" && d.responsavel_id !== fResp) return false;
      if (fPrio !== "todas" && d.prioridade !== fPrio) return false;
      if (fCat !== "todas" && d.categoria !== fCat) return false;
      return true;
    });
  }, [demandas, clienteId, busca, fResp, fPrio, fCat]);

  const resumo = useMemo(() => {
    const todas = demandas.filter((d) => d.cliente_id === clienteId);
    return {
      total: todas.length,
      andamento: todas.filter((d) =>
        ["Criar", "Revisar", "Entregue"].includes(d.status)
      ).length,
      atrasadas: todas.filter((d) => d.status === "Atrasado").length,
      urgentes: todas.filter((d) => d.prioridade === "Urgente").length,
      concluidas: todas.filter((d) => d.status === "Concluido").length,
    };
  }, [demandas, clienteId]);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => navigate("/demandas")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <Link to="/demandas" className="hover:underline">
          Demandas
        </Link>
        <span>/</span>
        <span>Clientes</span>
        <span>/</span>
        <span className="text-foreground font-medium">
          {cliente?.nome_cliente ?? "Cliente"}
        </span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {cliente?.logo_url ? (
            <img
              src={cliente.logo_url}
              alt={cliente.nome_cliente}
              className="h-12 w-12 rounded-lg object-cover border"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
              {cliente?.nome_cliente?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {cliente?.nome_cliente ?? "Cliente"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Projeto de demandas
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setNovaOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Demanda
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: "Total", value: resumo.total },
          { label: "Em andamento", value: resumo.andamento },
          { label: "Atrasadas", value: resumo.atrasadas, danger: true },
          { label: "Urgentes", value: resumo.urgentes, warn: true },
          { label: "Concluídas", value: resumo.concluidas },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-3">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide">
                {c.label}
              </div>
              <div
                className={`text-2xl font-bold ${
                  c.danger
                    ? "text-destructive"
                    : c.warn
                    ? "text-status-renovacao"
                    : ""
                }`}
              >
                {c.value}
              </div>
            </CardContent>
          </Card>
        ))}
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
          <Select value={fResp} onValueChange={setFResp}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos responsáveis</SelectItem>
              {responsaveis.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fPrio} onValueChange={setFPrio}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas prioridades</SelectItem>
              {PRIORIDADES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORIDADE_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fCat} onValueChange={setFCat}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORIA_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <ProjetoKanban demandas={filtradas} onOpen={setSelecionada} />

      <NovaDemandaDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        defaultClienteId={clienteId}
      />
      <DemandaDetalheDialog
        demanda={selecionada}
        onOpenChange={(v) => !v && setSelecionada(null)}
      />
    </div>
  );
}
