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

export type SortKey = "cliente" | "status" | "nicho" | "periodo";
export type SortDir = "asc" | "desc";
export type Density = "compacto" | "confortavel";
export type FiltroPeriodoContrato = "todos" | "30" | "90" | "vencido";

interface Props {
  filtroBusca?: string;
  filtroResponsaveis?: string[];
  apenasMinhas?: boolean;
  currentUserId?: string | null;
  filtroStatusGlobal?: string;
  filtroNichos?: string[];
  filtroPeriodoContrato?: FiltroPeriodoContrato;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSortChange?: (key: SortKey) => void;
  density?: Density;
  onAbrirHistorico?: (clienteId: string) => void;
  acoesSlot?: (clienteId: string) => React.ReactNode;
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
  sortKey = "cliente",
  sortDir = "asc",
  onSortChange,
  density = "compacto",
  onAbrirHistorico,
  acoesSlot,
}: Props) {
  const { clientes, cards, contratos, nichos, responsaveis } = useCRM();
  useDemandasBootstrap();
  const demandas = useDemandas((s) => s.demandas);

  const linhas = useMemo(() => {
    const termo = filtroBusca.trim().toLowerCase();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let lista = clientes.filter((c) => {
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
    sortKey,
    sortDir,
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
                      <TableHead className="min-w-[220px]">
                        <SortHeader
                          label="Cliente"
                          sortKey="cliente"
                          current={sortKey}
                          dir={sortDir}
                          onSortChange={onSortChange}
                        />
                      </TableHead>
                      <TableHead>
                        <SortHeader
                          label="Status"
                          sortKey="status"
                          current={sortKey}
                          dir={sortDir}
                          onSortChange={onSortChange}
                        />
                      </TableHead>
                      <TableHead className="min-w-[180px]">Último comentário</TableHead>
                      <TableHead>
                        <SortHeader
                          label="Nicho"
                          sortKey="nicho"
                          current={sortKey}
                          dir={sortDir}
                          onSortChange={onSortChange}
                        />
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        <SortHeader
                          label="Período do contrato"
                          sortKey="periodo"
                          current={sortKey}
                          dir={sortDir}
                          onSortChange={onSortChange}
                        />
                      </TableHead>
                      <TableHead className="text-center whitespace-nowrap">Posts atrasados</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Tarefas atrasadas</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Tarefas urgentes</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Onboarding</TableHead>
                      {acoesSlot && <TableHead className="text-right">Ações</TableHead>}
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

                      return (
                        <TableRow key={cliente.id} className="hover:bg-accent/30">
                          <TableCell className="text-xs text-muted-foreground tabular-nums w-10">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <Link
                              to={`/clientes/${cliente.id}`}
                              className="text-primary text-xs font-medium hover:underline truncate"
                            >
                              {cliente.nome_cliente}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <StatusClienteBadge status={cliente.status_global} />
                          </TableCell>
                          <TableCell className="text-xs">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAbrirHistorico?.(cliente.id);
                              }}
                              className="text-left truncate max-w-[220px] hover:text-primary"
                              title={cliente.ultimo_comentario}
                            >
                              {cliente.ultimo_comentario || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            {cliente.nicho && nichoOpt ? (
                              <ColorBadge label={nichoOpt.label} color={nichoOpt.cor} />
                            ) : (
                              <EmptyDash />
                            )}
                          </TableCell>
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

                          {/* Posts atrasados */}
                          <TableCell className="text-center">
                            {postsAtrasados === 0 ? (
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
                            )}
                          </TableCell>

                          {/* Tarefas atrasadas */}
                          <TableCell className="text-center">
                            {demAtrasadas === 0 ? (
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
                            )}
                          </TableCell>

                          {/* Tarefas urgentes */}
                          <TableCell className="text-center">
                            {demUrgentes === 0 ? (
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
                            )}
                          </TableCell>

                          {/* Onboarding */}
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

                          {acoesSlot && (
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
