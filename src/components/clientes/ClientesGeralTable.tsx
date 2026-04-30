import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useCRM } from "@/store/crm";
import { useDemandas } from "@/store/demandas";
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
import { CelulaResponsaveis } from "@/components/clientes/CelulaResponsaveis";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  Zap,
  CalendarClock,
  Hourglass,
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
  const { clientes, cards, contratos, nichos } = useCRM();
  const demandas = useDemandas((s) => s.demandas);

  const linhas = useMemo(() => {
    const termo = filtroBusca.trim().toLowerCase();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let lista = clientes.filter((c) => {
      // Status global
      if (
        filtroStatusGlobal !== "todos" &&
        (c.status_global ?? "Onboarding") !== filtroStatusGlobal
      )
        return false;

      // Responsáveis do cliente
      const respsCliente = c.responsaveis ?? [];
      if (filtroResponsaveis.length > 0) {
        if (!filtroResponsaveis.some((r) => respsCliente.includes(r))) return false;
      }
      if (apenasMinhas && currentUserId) {
        if (!respsCliente.includes(currentUserId)) return false;
      }

      // Nicho
      if (filtroNichos.length > 0) {
        if (!c.nicho || !filtroNichos.includes(c.nicho)) return false;
      }

      // Período do contrato
      if (filtroPeriodoContrato !== "todos") {
        if (!c.data_fim_contrato) return false;
        const fim = new Date(c.data_fim_contrato);
        const dias = diffDays(hoje, fim);
        if (filtroPeriodoContrato === "vencido" && dias >= 0) return false;
        if (filtroPeriodoContrato === "30" && (dias < 0 || dias > 30)) return false;
        if (filtroPeriodoContrato === "90" && (dias < 0 || dias > 90)) return false;
      }

      // Busca textual
      if (termo) {
        return (
          c.nome_cliente.toLowerCase().includes(termo) ||
          (c.nicho ?? "").toLowerCase().includes(termo) ||
          (c.observacoes ?? "").toLowerCase().includes(termo)
        );
      }
      return true;
    });

    // Ordenação
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
                      <TableHead className="w-10 text-xs text-muted-foreground">
                        #
                      </TableHead>
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
                      <TableHead>Responsáveis</TableHead>
                      <TableHead className="min-w-[180px]">
                        Último comentário
                      </TableHead>
                      <TableHead>
                        <SortHeader
                          label="Nicho"
                          sortKey="nicho"
                          current={sortKey}
                          dir={sortDir}
                          onSortChange={onSortChange}
                        />
                      </TableHead>
                      <TableHead>
                        <SortHeader
                          label="Período do contrato"
                          sortKey="periodo"
                          current={sortKey}
                          dir={sortDir}
                          onSortChange={onSortChange}
                        />
                      </TableHead>
                      {acoesSlot && (
                        <TableHead className="text-right">Ações</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((cliente, idx) => {
                      const cardsCli = cards.filter((k) => k.cliente_id === cliente.id);
                      const postsAtrasados = cardsCli.filter(
                        (k) => k.status_card === "Atrasado",
                      ).length;

                      const demandasCli = demandas.filter(
                        (d) => d.cliente_id === cliente.id,
                      );
                      const demAtrasadas = demandasCli.filter(
                        (d) => d.status === "Atrasado",
                      ).length;
                      const demUrgentes = demandasCli.filter(
                        (d) => d.prioridade === "Urgente",
                      ).length;

                      // Indicadores de contrato / onboarding
                      const hoje = new Date();
                      hoje.setHours(0, 0, 0, 0);
                      let contratoVenceEm: number | null = null;
                      if (cliente.data_fim_contrato) {
                        const fim = new Date(cliente.data_fim_contrato);
                        const d = diffDays(hoje, fim);
                        if (d >= 0 && d <= 15) contratoVenceEm = d;
                      }
                      let onboardingAtrasado = false;
                      if (
                        (cliente.status_global ?? "Onboarding") === "Onboarding" &&
                        cliente.prazo_onboarding
                      ) {
                        const prazo = new Date(cliente.prazo_onboarding);
                        if (diffDays(hoje, prazo) < 0) onboardingAtrasado = true;
                      }

                      const nichoOpt = nichos.find((n) => n.label === cliente.nicho);

                      const contrato = contratos.find((c) => c.cliente_id === cliente.id);
                      const fimContrato =
                        cliente.data_fim_contrato ?? contrato?.data_fim ?? null;
                      const inicioContrato =
                        cliente.data_inicio_contrato ?? contrato?.data_inicio ?? null;

                      return (
                        <TableRow
                          key={cliente.id}
                          className="hover:bg-accent/30"
                        >
                          <TableCell className="text-xs text-muted-foreground tabular-nums w-10">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Link
                                to={`/clientes/${cliente.id}`}
                                className="text-primary text-xs font-medium hover:underline truncate"
                              >
                                {cliente.nome_cliente}
                              </Link>
                              {/* Indicadores rápidos de saúde */}
                              <div className="flex items-center gap-1">
                                {postsAtrasados > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center gap-0.5 h-4 px-1 rounded bg-destructive/15 text-destructive text-[10px] font-semibold tabular-nums">
                                        <AlertTriangle className="h-2.5 w-2.5" />
                                        {postsAtrasados}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {postsAtrasados} post{postsAtrasados > 1 ? "s" : ""} atrasado{postsAtrasados > 1 ? "s" : ""}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {demAtrasadas > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center gap-0.5 h-4 px-1 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-semibold tabular-nums">
                                        <Hourglass className="h-2.5 w-2.5" />
                                        {demAtrasadas}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {demAtrasadas} Tarefa{demAtrasadas > 1 ? "s" : ""} atrasada{demAtrasadas > 1 ? "s" : ""}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {demUrgentes > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center gap-0.5 h-4 px-1 rounded bg-primary/15 text-primary text-[10px] font-semibold tabular-nums">
                                        <Zap className="h-2.5 w-2.5" />
                                        {demUrgentes}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {demUrgentes} Tarefa{demUrgentes > 1 ? "s" : ""} urgente{demUrgentes > 1 ? "s" : ""}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {contratoVenceEm !== null && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center h-4 w-4 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                        <CalendarClock className="h-2.5 w-2.5 mx-auto" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {contratoVenceEm === 0
                                        ? "Contrato vence hoje"
                                        : `Contrato vence em ${contratoVenceEm} dia${contratoVenceEm > 1 ? "s" : ""}`}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {onboardingAtrasado && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center h-4 px-1 rounded bg-destructive/15 text-destructive text-[10px] font-semibold">
                                        Onb.
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>Onboarding com prazo vencido</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusClienteBadge status={cliente.status_global} />
                          </TableCell>
                          <TableCell>
                            <CelulaResponsaveis
                              clienteId={cliente.id}
                              ids={cliente.responsaveis ?? []}
                            />
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
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground">
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
                          {acoesSlot && (
                            <TableCell className="text-right">
                              {acoesSlot(cliente.id)}
                            </TableCell>
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
