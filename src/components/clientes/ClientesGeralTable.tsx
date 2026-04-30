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
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calcularMetricasCliente,
  formatarAtividade,
  type NivelSaude,
} from "@/lib/cliente-saude";

export type SortKey =
  | "cliente"
  | "status"
  | "saude"
  | "entrega"
  | "atividade"
  | "nicho"
  | "periodo";
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
  filtroSaude?: NivelSaude[];
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

const SAUDE_ORDER: Record<NivelSaude, number> = {
  critico: 0,
  atencao: 1,
  ok: 2,
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

function SaudePill({
  nivel,
  motivos,
}: {
  nivel: NivelSaude;
  motivos: string[];
}) {
  const cfg =
    nivel === "ok"
      ? { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", label: "Ok" }
      : nivel === "atencao"
        ? { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", label: "Atenção" }
        : { dot: "bg-destructive", text: "text-destructive", bg: "bg-destructive/10", label: "Crítico" };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-semibold",
            cfg.bg,
            cfg.text,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
          {cfg.label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px]">
        <ul className="text-[11px] space-y-0.5">
          {motivos.map((m, i) => (
            <li key={i}>• {m}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function EntregaMes({ feitos, meta }: { feitos: number; meta: number }) {
  if (meta === 0) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }
  const pct = Math.min(100, Math.round((feitos / meta) * 100));
  const hoje = new Date();
  const passouMetade = hoje.getDate() > 15;
  const cor =
    pct >= 80
      ? "bg-emerald-500"
      : pct >= 40
        ? "bg-amber-500"
        : passouMetade
          ? "bg-destructive"
          : "bg-muted-foreground/40";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 min-w-[80px]">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", cor)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-muted-foreground whitespace-nowrap">
            {feitos}/{meta}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {feitos} de {meta} posts entregues no mês ({pct}%)
      </TooltipContent>
    </Tooltip>
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
  filtroSaude = [],
  sortKey = "cliente",
  sortDir = "asc",
  onSortChange,
  density = "compacto",
  onAbrirHistorico,
  acoesSlot,
}: Props) {
  const { clientes, cards, contratos, nichos, responsaveis, comentarios } = useCRM();
  const demandas = useDemandas((s) => s.demandas);

  // Pré-calcular métricas por cliente (saúde, entrega, atividade) — uma vez por render
  const metricasPorCliente = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const map = new Map<string, ReturnType<typeof calcularMetricasCliente>>();
    clientes.forEach((cli) => {
      const contrato = contratos.find((c) => c.cliente_id === cli.id);
      map.set(
        cli.id,
        calcularMetricasCliente({
          cliente: cli,
          cards,
          demandas,
          comentarios,
          contratoTotalPosts: contrato?.total_posts ?? null,
          hoje,
        }),
      );
    });
    return map;
  }, [clientes, cards, demandas, comentarios, contratos]);

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

      if (filtroSaude.length > 0) {
        const m = metricasPorCliente.get(c.id);
        if (!m || !filtroSaude.includes(m.saude.nivel)) return false;
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
      } else if (sortKey === "saude") {
        const ma = metricasPorCliente.get(a.id)?.saude.nivel ?? "ok";
        const mb = metricasPorCliente.get(b.id)?.saude.nivel ?? "ok";
        v = SAUDE_ORDER[ma] - SAUDE_ORDER[mb];
      } else if (sortKey === "entrega") {
        const ma = metricasPorCliente.get(a.id);
        const mb = metricasPorCliente.get(b.id);
        const pa = ma && ma.entregaMesMeta > 0 ? ma.entregaMesFeitos / ma.entregaMesMeta : -1;
        const pb = mb && mb.entregaMesMeta > 0 ? mb.entregaMesFeitos / mb.entregaMesMeta : -1;
        v = pa - pb;
      } else if (sortKey === "atividade") {
        const ta = metricasPorCliente.get(a.id)?.ultimaAtividadeMs ?? 0;
        const tb = metricasPorCliente.get(b.id)?.ultimaAtividadeMs ?? 0;
        v = ta - tb;
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
    filtroSaude,
    sortKey,
    sortDir,
    metricasPorCliente,
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
                      <TableHead>
                        <SortHeader
                          label="Saúde"
                          sortKey="saude"
                          current={sortKey}
                          dir={sortDir}
                          onSortChange={onSortChange}
                        />
                      </TableHead>
                      <TableHead className="min-w-[120px]">
                        <SortHeader
                          label="Entrega do mês"
                          sortKey="entrega"
                          current={sortKey}
                          dir={sortDir}
                          onSortChange={onSortChange}
                        />
                      </TableHead>
                      <TableHead>
                        <SortHeader
                          label="Atividade"
                          sortKey="atividade"
                          current={sortKey}
                          dir={sortDir}
                          onSortChange={onSortChange}
                        />
                      </TableHead>
                      <TableHead className="max-w-[180px]">
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
                          label="Contrato"
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
                      const metricas = metricasPorCliente.get(cliente.id);
                      const respsCli = responsaveis.filter((r) =>
                        (cliente.responsaveis ?? []).includes(r.id),
                      );
                      const nichoOpt = nichos.find((n) => n.label === cliente.nicho);
                      const contrato = contratos.find((c) => c.cliente_id === cliente.id);
                      const fimContrato =
                        cliente.data_fim_contrato ?? contrato?.data_fim ?? null;
                      const inicioContrato =
                        cliente.data_inicio_contrato ?? contrato?.data_inicio ?? null;

                      return (
                        <TableRow key={cliente.id} className="hover:bg-accent/30">
                          <TableCell className="text-xs text-muted-foreground tabular-nums w-10">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-0">
                              <Link
                                to={`/clientes/${cliente.id}`}
                                className="text-primary text-xs font-medium hover:underline truncate"
                              >
                                {cliente.nome_cliente}
                              </Link>
                              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                <CelulaResponsaveis
                                  clienteId={cliente.id}
                                  ids={cliente.responsaveis ?? []}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusClienteBadge status={cliente.status_global} />
                          </TableCell>
                          <TableCell>
                            {metricas && (
                              <SaudePill
                                nivel={metricas.saude.nivel}
                                motivos={metricas.saude.motivos}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {metricas && (
                              <EntregaMes
                                feitos={metricas.entregaMesFeitos}
                                meta={metricas.entregaMesMeta}
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground tabular-nums">
                            {formatarAtividade(metricas?.ultimaAtividadeMs ?? null)}
                          </TableCell>
                          <TableCell className="text-xs">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAbrirHistorico?.(cliente.id);
                              }}
                              className="text-left truncate max-w-[160px] block hover:text-primary"
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
