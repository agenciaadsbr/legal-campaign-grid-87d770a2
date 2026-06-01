import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useCRM } from "@/store/crm";
import { useDemandas, useDemandasBootstrap, getResponsaveisIds } from "@/store/demandas";
import { CATEGORIA_LABEL } from "@/lib/demandas-categorias";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ColorBadge } from "@/components/StatusBadge";
import { StatusClienteBadge } from "@/components/StatusClienteBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  Zap,
  Hourglass,
  CalendarX,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DataContratacaoCell,
  StatusRelacionamentoCell,
  StatusPerformanceCell,
  LinkRelatorioCell,
} from "@/components/clientes/ClienteCellEditors";
import { EstrategiasBadges } from "@/components/estrategias/EstrategiasBadges";
import { useColunasNativasClientes } from "@/lib/clientesColunasNativas";

export type SortKey = "cliente" | "status" | "nicho" | "periodo";
export type SortDir = "asc" | "desc";
export type Density = "compacto" | "confortavel";
export type FiltroPeriodoContrato = "todos" | "30" | "90" | "vencido";

export type PeriodoPreset =
  | "todos"
  | "hoje"
  | "esta_semana"
  | "prox_7"
  | "prox_14"
  | "prox_30"
  | "ult_7"
  | "ult_14"
  | "ult_30"
  | "mes_passado"
  | "custom";

export interface FiltroPeriodo {
  tipo: PeriodoPreset;
  inicio?: string;
  fim?: string;
}

interface Props {
  filtroBusca?: string;
  filtroResponsaveis?: string[];
  apenasMinhas?: boolean;
  currentUserId?: string | null;
  filtroStatusGlobal?: string;
  filtroNichos?: string[];
  filtroPeriodoContrato?: FiltroPeriodoContrato;
  filtroPeriodo?: FiltroPeriodo;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSortChange?: (key: SortKey) => void;
  density?: Density;
  onAbrirHistorico?: (clienteId: string) => void;
  acoesSlot?: (clienteId: string) => React.ReactNode;
  mostrarOcultos?: boolean;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Resolve um FiltroPeriodo em um intervalo [inicio, fim].
 * modo "futuro" = a vencer; "passado" = vencidos; "ambos" = qualquer.
 */
export function resolveIntervaloPeriodo(
  filtro: FiltroPeriodo | undefined,
): { inicio: Date; fim: Date; modo: "futuro" | "passado" | "ambos" } | null {
  if (!filtro || filtro.tipo === "todos") return null;
  const hoje = startOfDay(new Date());
  switch (filtro.tipo) {
    case "hoje":
      // hoje + atrasados até hoje
      return { inicio: new Date(0), fim: endOfDay(hoje), modo: "ambos" };
    case "esta_semana": {
      const dow = hoje.getDay(); // 0=dom
      const diffSeg = dow === 0 ? -6 : 1 - dow;
      const inicio = addDays(hoje, diffSeg);
      const fim = endOfDay(addDays(inicio, 6));
      return { inicio, fim, modo: "ambos" };
    }
    case "prox_7":
      return { inicio: hoje, fim: endOfDay(addDays(hoje, 7)), modo: "futuro" };
    case "prox_14":
      return { inicio: hoje, fim: endOfDay(addDays(hoje, 14)), modo: "futuro" };
    case "prox_30":
      return { inicio: hoje, fim: endOfDay(addDays(hoje, 30)), modo: "futuro" };
    case "ult_7":
      return { inicio: addDays(hoje, -7), fim: endOfDay(hoje), modo: "passado" };
    case "ult_14":
      return { inicio: addDays(hoje, -14), fim: endOfDay(hoje), modo: "passado" };
    case "ult_30":
      return { inicio: addDays(hoje, -30), fim: endOfDay(hoje), modo: "passado" };
    case "mes_passado": {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fim = endOfDay(new Date(hoje.getFullYear(), hoje.getMonth(), 0));
      return { inicio, fim, modo: "passado" };
    }
    case "custom": {
      if (!filtro.inicio || !filtro.fim) return null;
      return {
        inicio: startOfDay(new Date(filtro.inicio)),
        fim: endOfDay(new Date(filtro.fim)),
        modo: "ambos",
      };
    }
    default:
      return null;
  }
}

const STATUS_ORDER: Record<string, number> = {
  Onboarding: 0,
  Ativo: 1,
  Pausado: 2,
  Encerrado: 3,
};

function diffDays(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSortChange,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current?: SortKey;
  dir?: SortDir;
  onSortChange?: (k: SortKey) => void;
  className?: string;
}) {
  if (!onSortChange) return <span className={className}>{label}</span>;
  const active = current === sortKey;
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={() => onSortChange(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground transition-colors",
        active && "text-foreground font-semibold",
        className,
      )}
    >
      {label}
      <Icon className="h-3 w-3 opacity-70" />
    </button>
  );
}

type AlertTone = "destructive" | "amber" | "primary";

function AlertBadge({
  count,
  icon: Icon,
  tone,
  label,
}: {
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: AlertTone;
  label?: string;
}) {
  const toneClass =
    tone === "destructive"
      ? "bg-destructive/15 text-destructive"
      : tone === "amber"
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      : "bg-primary/15 text-primary";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-5 px-1.5 rounded text-[11px] font-semibold tabular-nums",
        toneClass,
      )}
    >
      <Icon className="h-3 w-3" />
      {label ?? count}
    </span>
  );
}

function EmptyDash() {
  return <span className="text-xs text-muted-foreground">—</span>;
}

export function ClientesGeralTable({
  filtroBusca = "",
  filtroResponsaveis = [],
  apenasMinhas = false,
  currentUserId = null,
  filtroStatusGlobal = "todos",
  filtroNichos = [],
  filtroPeriodoContrato = "todos",
  filtroPeriodo,
  sortKey = "cliente",
  sortDir = "asc",
  onSortChange,
  density = "compacto",
  onAbrirHistorico,
  acoesSlot,
  mostrarOcultos = false,
}: Props) {
  const { clientes, cards, contratos, nichos, responsaveis, heavyDataLoaded } = useCRM();
  const { isVisible } = useColunasNativasClientes();
  useDemandasBootstrap();
  const demandas = useDemandas((s) => s.demandas);

  const linhas = useMemo(() => {
    const termo = filtroBusca.trim().toLowerCase();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const intervalo = resolveIntervaloPeriodo(filtroPeriodo);

    let lista = clientes.filter((c) => {
      if (!mostrarOcultos && c.oculto) return false;
      if (
        filtroStatusGlobal !== "todos" &&
        (c.status_global ?? "Onboarding") !== filtroStatusGlobal
      )
        return false;

      const respsCliente = c.responsaveis ?? [];
      if (filtroResponsaveis.length > 0) {
        if (!filtroResponsaveis.some((r) => respsCliente.includes(r))) return false;
      }
      if (apenasMinhas && currentUserId) {
        if (!respsCliente.includes(currentUserId)) return false;
      }

      if (filtroNichos.length > 0) {
        if (!c.nicho || !filtroNichos.includes(c.nicho)) return false;
      }

      if (filtroPeriodoContrato !== "todos") {
        if (!c.data_fim_contrato) return false;
        const fim = new Date(c.data_fim_contrato);
        const dias = diffDays(hoje, fim);
        if (filtroPeriodoContrato === "vencido" && dias >= 0) return false;
        if (filtroPeriodoContrato === "30" && (dias < 0 || dias > 30)) return false;
        if (filtroPeriodoContrato === "90" && (dias < 0 || dias > 90)) return false;
      }

      if (intervalo) {
        const cardsDoCli = cards.filter((k) => k.cliente_id === c.id);
        const demDoCli = demandas.filter((d) => d.cliente_id === c.id);
        const datas: number[] = [];
        for (const k of cardsDoCli) {
          if (k.status_card === "Concluído" || k.status_card === "Aprovado") continue;
          if (!k.data_agendada) continue;
          datas.push(new Date(k.data_agendada).getTime());
        }
        for (const d of demDoCli) {
          if (d.status === "Concluido") continue;
          if (!d.data_limite) continue;
          datas.push(new Date(d.data_limite).getTime());
        }
        const ini = intervalo.inicio.getTime();
        const fim = intervalo.fim.getTime();
        const match = datas.some((t) => {
          if (intervalo.modo === "futuro") return t >= ini && t <= fim;
          if (intervalo.modo === "passado") return t >= ini && t <= fim;
          return t <= fim && t >= ini;
        });
        if (!match) return false;
      }

      if (termo) {
        return (
          c.nome_cliente.toLowerCase().includes(termo) ||
          (c.nicho ?? "").toLowerCase().includes(termo) ||
          (c.observacoes ?? "").toLowerCase().includes(termo)
        );
      }
      return true;
    });

    const cmp = (a: typeof clientes[number], b: typeof clientes[number]) => {
      let v = 0;
      if (sortKey === "cliente") {
        v = a.nome_cliente.localeCompare(b.nome_cliente, "pt-BR", { sensitivity: "base" });
      } else if (sortKey === "status") {
        const sa = STATUS_ORDER[a.status_global ?? "Onboarding"] ?? 99;
        const sb = STATUS_ORDER[b.status_global ?? "Onboarding"] ?? 99;
        v = sa - sb;
      } else if (sortKey === "nicho") {
        v = (a.nicho ?? "").localeCompare(b.nicho ?? "", "pt-BR", { sensitivity: "base" });
      } else if (sortKey === "periodo") {
        const da = a.data_inicio_contrato ? new Date(a.data_inicio_contrato).getTime() : 0;
        const db = b.data_inicio_contrato ? new Date(b.data_inicio_contrato).getTime() : 0;
        v = da - db;
      }
      return sortDir === "asc" ? v : -v;
    };
    lista = [...lista].sort(cmp);
    return lista;
  }, [
    clientes,
    filtroBusca,
    filtroResponsaveis,
    apenasMinhas,
    currentUserId,
    filtroStatusGlobal,
    filtroNichos,
    filtroPeriodoContrato,
    filtroPeriodo,
    cards,
    demandas,
    sortKey,
    sortDir,
    mostrarOcultos,
  ]);

  const denseTh =
    density === "compacto"
      ? "[&_th]:py-1 [&_th]:px-2 [&_th]:h-7"
      : "[&_th]:py-2.5 [&_th]:px-3 [&_th]:h-10";
  const denseTd =
    density === "compacto"
      ? "[&_td]:py-1 [&_td]:px-2"
      : "[&_td]:py-2.5 [&_td]:px-3";

  const tooltipContentClass =
    "max-w-[420px] min-w-[280px] p-0 bg-popover text-popover-foreground border border-border shadow-lg";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-1.5">
        <Card>
          <CardContent className="p-0">
            {linhas.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                Nenhum cliente encontrado
              </div>
            ) : (
              <div className="overflow-auto">
                <Table className={cn(denseTh, denseTd)}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-xs text-muted-foreground">#</TableHead>
                      {isVisible("cliente") && (
                        <TableHead className="min-w-[220px]">
                          <SortHeader
                            label="Cliente"
                            sortKey="cliente"
                            current={sortKey}
                            dir={sortDir}
                            onSortChange={onSortChange}
                          />
                        </TableHead>
                      )}
                      {isVisible("status") && (
                        <TableHead>
                          <SortHeader
                            label="Status"
                            sortKey="status"
                            current={sortKey}
                            dir={sortDir}
                            onSortChange={onSortChange}
                          />
                        </TableHead>
                      )}
                      {isVisible("ultimo_comentario") && (
                        <TableHead className="min-w-[160px]">
                          <div className="leading-tight">
                            <div>Último</div>
                            <div>comentário</div>
                          </div>
                        </TableHead>
                      )}
                      {isVisible("nicho") && (
                        <TableHead>
                          <SortHeader
                            label="Nicho"
                            sortKey="nicho"
                            current={sortKey}
                            dir={sortDir}
                            onSortChange={onSortChange}
                          />
                        </TableHead>
                      )}
                      {isVisible("periodo") && (
                        <TableHead className="whitespace-nowrap">
                          <SortHeader
                            label="Período do contrato"
                            sortKey="periodo"
                            current={sortKey}
                            dir={sortDir}
                            onSortChange={onSortChange}
                          />
                        </TableHead>
                      )}
                      {isVisible("posts_atrasados") && (
                        <TableHead className="text-center w-[90px]">
                          <div className="leading-tight">
                            <div>Posts</div>
                            <div>atrasados</div>
                          </div>
                        </TableHead>
                      )}
                      {isVisible("tarefas_atrasadas") && (
                        <TableHead className="text-center w-[90px]">
                          <div className="leading-tight">
                            <div>Tarefas</div>
                            <div>atrasadas</div>
                          </div>
                        </TableHead>
                      )}
                      {isVisible("tarefas_urgentes") && (
                        <TableHead className="text-center w-[90px]">
                          <div className="leading-tight">
                            <div>Tarefas</div>
                            <div>urgentes</div>
                          </div>
                        </TableHead>
                      )}
                      {isVisible("onboarding") && (
                        <TableHead className="text-center w-[110px]">Onboarding</TableHead>
                      )}
                      {isVisible("contratacao") && (
                        <TableHead className="whitespace-nowrap text-xs text-muted-foreground">Contratação</TableHead>
                      )}
                      {isVisible("relacionamento") && (
                        <TableHead className="whitespace-nowrap text-xs text-muted-foreground">Relacionamento</TableHead>
                      )}
                      {isVisible("performance") && (
                        <TableHead className="whitespace-nowrap text-xs text-muted-foreground">Performance</TableHead>
                      )}
                      {isVisible("relatorio") && (
                        <TableHead className="whitespace-nowrap text-xs text-muted-foreground">Relatório</TableHead>
                      )}
                      {acoesSlot && isVisible("acoes") && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((cliente, idx) => {
                      const cardsCli = cards.filter((k) => k.cliente_id === cliente.id);
                      const postsAtrasadosList = cardsCli
                        .filter((k) => k.status_card === "Atrasado")
                        .sort((a, b) => a.titulo_card.localeCompare(b.titulo_card, "pt-BR"));
                      const postsAtrasados = postsAtrasadosList.length;

                      const demandasCli = demandas.filter((d) => d.cliente_id === cliente.id);
                      const demAtrasadasList = demandasCli
                        .filter((d) => d.status === "Atrasado")
                        .sort((a, b) => {
                          const da = a.data_limite ? new Date(a.data_limite).getTime() : Infinity;
                          const db = b.data_limite ? new Date(b.data_limite).getTime() : Infinity;
                          return da - db;
                        });
                      const demAtrasadas = demAtrasadasList.length;
                      const demUrgentesList = demandasCli
                        .filter((d) => d.prioridade === "Urgente")
                        .sort((a, b) => {
                          const da = a.data_limite ? new Date(a.data_limite).getTime() : Infinity;
                          const db = b.data_limite ? new Date(b.data_limite).getTime() : Infinity;
                          return da - db;
                        });
                      const demUrgentes = demUrgentesList.length;

                      const hoje = new Date();
                      hoje.setHours(0, 0, 0, 0);
                      let onboardingState: "vencido" | "pendente" | null = null;
                      if (
                        (cliente.status_global ?? "Onboarding") === "Onboarding" &&
                        cliente.prazo_onboarding
                      ) {
                        const prazo = new Date(cliente.prazo_onboarding);
                        const d = diffDays(hoje, prazo);
                        if (d < 0) onboardingState = "vencido";
                        else if (d <= 3) onboardingState = "pendente";
                      }

                      const nichoOpt = nichos.find((n) => n.label === cliente.nicho);
                      const contrato = contratos.find((c) => c.cliente_id === cliente.id);
                      const fimContrato = cliente.data_fim_contrato ?? contrato?.data_fim ?? null;
                      const inicioContrato =
                        cliente.data_inicio_contrato ?? contrato?.data_inicio ?? null;

                      const renderTaskList = (
                        list: typeof demAtrasadasList,
                        total: number,
                        labelSingular: string,
                        labelPlural: string,
                      ) => (
                        <div className="p-3 space-y-2 text-xs">
                          <div className="font-semibold text-sm">
                            {total} {total > 1 ? labelPlural : labelSingular}
                          </div>
                          <ul className="space-y-1.5">
                            {list.slice(0, 5).map((d) => {
                              const catLabel = CATEGORIA_LABEL[d.categoria] ?? "Outro";
                              const prazo = d.data_limite
                                ? new Date(d.data_limite).toLocaleDateString("pt-BR")
                                : "sem prazo";
                              const respIds = getResponsaveisIds(d);
                              const respNomes = respIds
                                .map((id) => responsaveis.find((r) => r.id === id)?.nome)
                                .filter(Boolean) as string[];
                              const respLabel =
                                respNomes.length === 0
                                  ? null
                                  : respNomes.length === 1
                                  ? respNomes[0]
                                  : `${respNomes[0]} +${respNomes.length - 1}`;
                              return (
                                <li
                                  key={d.id}
                                  className="border-b border-border/60 last:border-0 pb-1.5 last:pb-0"
                                >
                                  <div className="font-medium line-clamp-2 break-words">
                                    {d.titulo}
                                  </div>
                                  <div className="text-muted-foreground mt-0.5 leading-snug">
                                    <div>Categoria: {catLabel}</div>
                                    {respLabel && <div>Responsável: {respLabel}</div>}
                                    <div>Prazo: {prazo}</div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                          {total > 5 && (
                            <div className="text-muted-foreground pt-1 border-t border-border/60">
                              + {total - 5} {total - 5 > 1 ? labelPlural : labelSingular}
                            </div>
                          )}
                        </div>
                      );

                      const renderSkeleton = () => (
                        <div className="flex justify-center">
                          <div className="h-4 w-10 bg-muted animate-pulse rounded" />
                        </div>
                      );

                      return (
                        <TableRow key={cliente.id} className="hover:bg-accent/30">
                          <TableCell className="text-xs text-muted-foreground tabular-nums w-10">
                            {idx + 1}
                          </TableCell>
                          {isVisible("cliente") && (
                            <TableCell className="min-w-[200px] max-w-[260px]">
                              <Link
                                to={`/clientes/${cliente.id}`}
                                className="text-primary text-xs font-medium hover:underline break-words leading-snug block"
                              >
                                {cliente.nome_cliente}
                              </Link>
                              <EstrategiasBadges clienteId={cliente.id} size="xs" className="mt-0.5" />
                            </TableCell>
                          )}
                          {isVisible("status") && (
                            <TableCell>
                              <StatusClienteBadge status={cliente.status_global} />
                            </TableCell>
                          )}
                          {isVisible("ultimo_comentario") && (
                            <TableCell className="text-xs max-w-[240px]">
                              {!heavyDataLoaded ? (
                                <div className="h-4 w-full bg-muted animate-pulse rounded max-w-[150px]" />
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAbrirHistorico?.(cliente.id);
                                  }}
                                  className="text-left hover:text-primary line-clamp-2 break-words leading-snug w-full"
                                  title={cliente.ultimo_comentario}
                                >
                                  {cliente.ultimo_comentario || (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </button>
                              )}
                            </TableCell>
                          )}
                          {isVisible("nicho") && (
                            <TableCell>
                              {cliente.nicho && nichoOpt ? (
                                <ColorBadge label={nichoOpt.label} color={nichoOpt.cor} />
                              ) : (
                                <EmptyDash />
                              )}
                            </TableCell>
                          )}
                          {isVisible("periodo") && (
                            <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                              {inicioContrato ? (
                                <>
                                  {new Date(inicioContrato).toLocaleDateString("pt-BR")}
                                  {" → "}
                                  {fimContrato
                                    ? new Date(fimContrato).toLocaleDateString("pt-BR")
                                    : "—"}
                                </>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          )}

                          {/* Posts atrasados */}
                          {isVisible("posts_atrasados") && (
                            <TableCell className="text-center">
                              {!heavyDataLoaded ? renderSkeleton() : (
                                postsAtrasados === 0 ? (
                                  <EmptyDash />
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" className="inline-flex">
                                        <AlertBadge
                                          count={postsAtrasados}
                                          icon={AlertTriangle}
                                          tone="destructive"
                                        />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="bottom"
                                      align="center"
                                      className={tooltipContentClass}
                                    >
                                      <div className="p-3 space-y-2 text-xs">
                                        <div className="font-semibold text-sm">
                                          {postsAtrasados} post{postsAtrasados > 1 ? "s" : ""} atrasado
                                          {postsAtrasados > 1 ? "s" : ""}
                                        </div>
                                        <ul className="space-y-1">
                                          {postsAtrasadosList.slice(0, 5).map((p) => (
                                            <li
                                              key={p.id}
                                              className="border-b border-border/60 last:border-0 pb-1 last:pb-0"
                                            >
                                              <div className="font-medium line-clamp-2 break-words">
                                                Criar post — {p.titulo_card}
                                              </div>
                                            </li>
                                          ))}
                                        </ul>
                                        {postsAtrasados > 5 && (
                                          <div className="text-muted-foreground pt-1 border-t border-border/60">
                                            + {postsAtrasados - 5} post
                                            {postsAtrasados - 5 > 1 ? "s" : ""} atrasado
                                            {postsAtrasados - 5 > 1 ? "s" : ""}
                                          </div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )
                              )}
                            </TableCell>
                          )}

                          {/* Tarefas atrasadas */}
                          {isVisible("tarefas_atrasadas") && (
                            <TableCell className="text-center">
                              {!heavyDataLoaded ? renderSkeleton() : (
                                demAtrasadas === 0 ? (
                                  <EmptyDash />
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" className="inline-flex">
                                        <AlertBadge
                                          count={demAtrasadas}
                                          icon={Hourglass}
                                          tone="amber"
                                        />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="bottom"
                                      align="center"
                                      className={tooltipContentClass}
                                    >
                                      {renderTaskList(
                                        demAtrasadasList,
                                        demAtrasadas,
                                        "tarefa atrasada",
                                        "tarefas atrasadas",
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                )
                              )}
                            </TableCell>
                          )}

                          {/* Tarefas urgentes */}
                          {isVisible("tarefas_urgentes") && (
                            <TableCell className="text-center">
                              {!heavyDataLoaded ? renderSkeleton() : (
                                demUrgentes === 0 ? (
                                  <EmptyDash />
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" className="inline-flex">
                                        <AlertBadge count={demUrgentes} icon={Zap} tone="primary" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="bottom"
                                      align="center"
                                      className={tooltipContentClass}
                                    >
                                      {renderTaskList(
                                        demUrgentesList,
                                        demUrgentes,
                                        "tarefa urgente",
                                        "tarefas urgentes",
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                )
                              )}
                            </TableCell>
                          )}

                          {/* Onboarding */}
                          {isVisible("onboarding") && (
                            <TableCell className="text-center">
                              {onboardingState === null ? (
                                <EmptyDash />
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="inline-flex">
                                      <AlertBadge
                                        count={0}
                                        icon={CalendarX}
                                        tone={onboardingState === "vencido" ? "destructive" : "amber"}
                                        label={onboardingState === "vencido" ? "Vencido" : "Pendente"}
                                      />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="bottom"
                                    align="center"
                                    className="bg-popover text-popover-foreground border border-border shadow-lg"
                                  >
                                    {onboardingState === "vencido"
                                      ? "Onboarding com prazo vencido"
                                      : "Onboarding pendente"}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </TableCell>
                          )}

                          {isVisible("contratacao") && (
                            <TableCell className="whitespace-nowrap">
                              <DataContratacaoCell clienteId={cliente.id} value={cliente.data_contratacao} />
                            </TableCell>
                          )}
                          {isVisible("relacionamento") && (
                            <TableCell>
                              <StatusRelacionamentoCell clienteId={cliente.id} value={cliente.status_relacionamento} />
                            </TableCell>
                          )}
                          {isVisible("performance") && (
                            <TableCell>
                              <StatusPerformanceCell clienteId={cliente.id} value={cliente.status_performance} />
                            </TableCell>
                          )}
                          {isVisible("relatorio") && (
                            <TableCell>
                              <LinkRelatorioCell clienteId={cliente.id} value={cliente.link_relatorio} />
                            </TableCell>
                          )}
                          {acoesSlot && isVisible("acoes") && (
                            <TableCell className="text-right">{acoesSlot(cliente.id)}</TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
