import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemandas, getResponsaveisIds } from "@/store/demandas";
import { useCRM } from "@/store/crm";
import { ColorBadge } from "@/components/StatusBadge";
import { HistoricoComentariosDialog } from "@/components/HistoricoComentariosDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { StatusClienteBadge } from "@/components/StatusClienteBadge";
import { AvatarStack } from "@/components/AvatarStack";
import { ArrowRight, AlertTriangle, Zap } from "lucide-react";
import type { Demanda } from "@/store/demandas";

function DemandasTooltipList({
  titulo,
  demandas,
  responsaveis,
  variant,
}: {
  titulo: string;
  demandas: Demanda[];
  responsaveis: { id: string; nome: string }[];
  variant: "atrasadas" | "urgentes" | "total";
}) {
  const borderColor =
    variant === "atrasadas"
      ? "hsl(var(--destructive))"
      : variant === "urgentes"
        ? "hsl(var(--primary))"
        : "hsl(var(--border))";
  const max = 6;
  const visiveis = demandas.slice(0, max);
  const restantes = demandas.length - visiveis.length;
  const respMap = new Map(responsaveis.map((r) => [r.id, r.nome]));

  return (
    <div className="max-w-[340px] space-y-2">
      <div className="text-xs font-semibold text-popover-foreground border-b border-border pb-1">
        {demandas.length} {titulo}
      </div>
      <ul className="space-y-1.5">
        {visiveis.map((d) => {
          const respIds = (d.responsaveis_ids?.length
            ? d.responsaveis_ids
            : d.responsavel_id
              ? [d.responsavel_id]
              : []) as string[];
          const respNomes = respIds
            .map((id) => respMap.get(id))
            .filter(Boolean)
            .join(", ");
          const dataLimite = d.data_limite
            ? new Date(d.data_limite).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })
            : null;
          const vencida =
            d.data_limite && new Date(d.data_limite).getTime() < Date.now();
          return (
            <li
              key={d.id}
              className="text-[11px] leading-tight border-l-2 pl-2"
              style={{ borderColor }}
            >
              <div className="font-medium text-popover-foreground truncate">
                {d.titulo}
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-x-2">
                <span>{d.categoria}{d.subtipo ? ` · ${d.subtipo}` : ""}</span>
                <span>· {d.status}</span>
              </div>
              {(dataLimite || respNomes) && (
                <div className="text-muted-foreground flex flex-wrap gap-x-2">
                  {dataLimite && (
                    <span className={vencida ? "text-destructive font-medium" : ""}>
                      Prazo: {dataLimite}
                    </span>
                  )}
                  {respNomes && <span>· {respNomes}</span>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {restantes > 0 && (
        <div className="text-[11px] text-muted-foreground italic">
          … e mais {restantes}
        </div>
      )}
    </div>
  );
}

function ResponsaveisComTooltip({
  responsaveis,
  contagem,
  max = 4,
}: {
  responsaveis: { id: string; nome: string; cor?: string | null }[];
  contagem: Map<string, number>;
  max?: number;
}) {
  const visible = responsaveis.slice(0, max);
  const overflow = responsaveis.slice(max);
  const sizeCls = "h-5 w-5 text-[9px]";

  return (
    <div className="flex -space-x-2">
      {visible.map((r) => {
        const qtd = contagem.get(r.id) ?? 0;
        return (
          <Tooltip key={r.id}>
            <TooltipTrigger asChild>
              <div
                onClick={(e) => e.stopPropagation()}
                className={`rounded-full ring-2 ring-background flex items-center justify-center font-semibold text-white cursor-help ${sizeCls}`}
                style={{ backgroundColor: r.cor ?? "hsl(var(--primary))" }}
              >
                {r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="px-2.5 py-1.5">
              <div className="text-xs font-medium">{r.nome}</div>
              <div className="text-[11px] text-muted-foreground">
                {qtd} {qtd === 1 ? "demanda atribuída" : "demandas atribuídas"}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
      {overflow.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={(e) => e.stopPropagation()}
              className={`rounded-full ring-2 ring-background bg-muted text-muted-foreground flex items-center justify-center font-semibold cursor-help ${sizeCls}`}
            >
              +{overflow.length}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="px-2.5 py-1.5">
            <ul className="text-[11px] space-y-0.5">
              {overflow.map((r) => (
                <li key={r.id}>
                  {r.nome} — {contagem.get(r.id) ?? 0}
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

interface Props {
  filtroResp?: string;
  filtroStatus?: string;
  filtroPrio?: string;
  filtroBusca?: string;
  filtroStatusGlobal?: string;
}

export function ClientesDemandasTable({
  filtroResp = "todos",
  filtroStatus = "todos",
  filtroPrio = "todas",
  filtroBusca = "",
  filtroStatusGlobal = "todos",
}: Props) {
  const demandas = useDemandas((s) => s.demandas);
  const { clientes, nichos, responsaveis } = useCRM();
  const navigate = useNavigate();
  const [historicoClienteId, setHistoricoClienteId] = useState<string | null>(null);

  const linhas = useMemo(() => {
    const filtroAtivo =
      filtroResp !== "todos" || filtroStatus !== "todos" || filtroPrio !== "todas";

    const filtradas = demandas.filter((d) => {
      const resps = getResponsaveisIds(d);
      if (filtroResp !== "todos" && !resps.includes(filtroResp)) return false;
      if (filtroStatus !== "todos" && d.status !== filtroStatus) return false;
      if (filtroPrio !== "todas" && d.prioridade !== filtroPrio) return false;
      return true;
    });

    const map = new Map<
      string,
      {
        cliente_id: string;
        nome: string;
        statusGlobal: string;
        responsaveisIds: Set<string>;
        ultimaAtividade: string;
        total: number;
        atrasadas: number;
        urgentes: number;
        todasDemandas: Demanda[];
        demandasAtrasadas: Demanda[];
        demandasUrgentes: Demanda[];
        contagemPorResp: Map<string, number>;
        temDemanda: boolean;
      }
    >();

    // Inicializa com todos os clientes (sem responsáveis cadastrais — passam a vir das demandas)
    clientes.forEach((c) => {
      if (
        filtroStatusGlobal !== "todos" &&
        (c.status_global ?? "Onboarding") !== filtroStatusGlobal
      )
        return;
      map.set(c.id, {
        cliente_id: c.id,
        nome: c.nome_cliente,
        statusGlobal: c.status_global ?? "Onboarding",
        responsaveisIds: new Set<string>(),
        ultimaAtividade: c.created_at,
        total: 0,
        atrasadas: 0,
        urgentes: 0,
        todasDemandas: [],
        demandasAtrasadas: [],
        demandasUrgentes: [],
        contagemPorResp: new Map<string, number>(),
        temDemanda: false,
      });
    });

    // Agrega métricas + responsáveis das demandas filtradas
    filtradas.forEach((d) => {
      const existing = map.get(d.cliente_id);
      if (!existing && filtroStatusGlobal !== "todos") return;
      const cur = existing ?? {
        cliente_id: d.cliente_id,
        nome: "Cliente removido",
        statusGlobal: "Onboarding",
        responsaveisIds: new Set<string>(),
        ultimaAtividade: d.updated_at,
        total: 0,
        atrasadas: 0,
        urgentes: 0,
        todasDemandas: [] as Demanda[],
        demandasAtrasadas: [] as Demanda[],
        demandasUrgentes: [] as Demanda[],
        contagemPorResp: new Map<string, number>(),
        temDemanda: false,
      };
      cur.total += 1;
      cur.temDemanda = true;
      cur.todasDemandas.push(d);
      if (d.status === "Atrasado") {
        cur.atrasadas += 1;
        cur.demandasAtrasadas.push(d);
      }
      if (d.prioridade === "Urgente") {
        cur.urgentes += 1;
        cur.demandasUrgentes.push(d);
      }
      getResponsaveisIds(d).forEach((rid) => {
        cur.responsaveisIds.add(rid);
        cur.contagemPorResp.set(rid, (cur.contagemPorResp.get(rid) ?? 0) + 1);
      });
      if (new Date(d.updated_at) > new Date(cur.ultimaAtividade)) {
        cur.ultimaAtividade = d.updated_at;
      }
      map.set(d.cliente_id, cur);
    });

    let lista = Array.from(map.values());

    if (filtroAtivo) {
      lista = lista.filter((l) => l.temDemanda);
    }

    if (filtroBusca.trim()) {
      const q = filtroBusca.toLowerCase();
      lista = lista.filter((l) => l.nome.toLowerCase().includes(q));
    }

    lista.sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
    );
    return lista;
  }, [demandas, clientes, filtroBusca, filtroResp, filtroStatus, filtroPrio, filtroStatusGlobal]);

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-1.5">

      <Card>
        <CardContent className="p-0">
          {linhas.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Nenhum cliente cadastrado
            </div>
          ) : (
            <Table className="[&_th]:py-1 [&_th]:px-2 [&_th]:h-7 [&_td]:py-0.5 [&_td]:px-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-xs text-muted-foreground">#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status do cliente</TableHead>
                  <TableHead>Responsáveis das Demandas</TableHead>
                  <TableHead className="min-w-[180px]">Último comentário</TableHead>
                  <TableHead>Nicho</TableHead>
                  <TableHead>Última atividade</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Atrasadas</TableHead>
                  <TableHead className="text-center">Urgentes</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l, idx) => {
                  const clienteAtual = clientes.find((c) => c.id === l.cliente_id);
                  const respObjs = responsaveis.filter((r) => l.responsaveisIds.has(r.id));
                  const nichoOpt = nichos.find((n) => n.label === clienteAtual?.nicho);
                  return (
                    <TableRow
                      key={l.cliente_id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/demandas/cliente/${l.cliente_id}`)}
                    >
                      <TableCell className="text-xs text-muted-foreground tabular-nums w-10">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">{l.nome}</TableCell>
                      <TableCell>
                        <StatusClienteBadge status={l.statusGlobal} />
                      </TableCell>
                      <TableCell>
                        {respObjs.length > 0 ? (
                          <AvatarStack responsaveis={respObjs} size="xs" max={4} />
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHistoricoClienteId(l.cliente_id);
                          }}
                          className="text-left truncate max-w-[220px] hover:text-primary block"
                          title={clienteAtual?.ultimo_comentario}
                        >
                          {clienteAtual?.ultimo_comentario || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        {clienteAtual?.nicho && nichoOpt ? (
                          <ColorBadge label={nichoOpt.label} color={nichoOpt.cor} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(l.ultimaAtividade).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {l.total}
                      </TableCell>
                      <TableCell className="text-center">
                        {l.atrasadas > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="destructive"
                                className="gap-1 h-5 px-1.5 text-xs cursor-help"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AlertTriangle className="h-3 w-3" />
                                {l.atrasadas}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="p-3">
                              <DemandasTooltipList
                                titulo={l.atrasadas === 1 ? "demanda atrasada" : "demandas atrasadas"}
                                demandas={l.demandasAtrasadas}
                                responsaveis={responsaveis}
                                variant="atrasadas"
                              />
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {l.urgentes > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                className="gap-1 h-5 px-1.5 text-xs bg-status-renovacao text-white cursor-help"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Zap className="h-3 w-3" />
                                {l.urgentes}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="p-3">
                              <DemandasTooltipList
                                titulo={l.urgentes === 1 ? "demanda urgente" : "demandas urgentes"}
                                demandas={l.demandasUrgentes}
                                responsaveis={responsaveis}
                                variant="urgentes"
                              />
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/demandas/cliente/${l.cliente_id}`);
                          }}
                        >
                          Abrir <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <HistoricoComentariosDialog
        clienteId={historicoClienteId}
        open={!!historicoClienteId}
        onOpenChange={(v) => !v && setHistoricoClienteId(null)}
      />
    </div>
    </TooltipProvider>
  );
}
