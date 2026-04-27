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
import { Badge } from "@/components/ui/badge";
import { AvatarStack } from "@/components/AvatarStack";
import { ColorBadge } from "@/components/StatusBadge";
import { StatusClienteBadge } from "@/components/StatusClienteBadge";
import { CelulaResponsaveis } from "@/components/clientes/CelulaResponsaveis";
import { AlertTriangle, Zap } from "lucide-react";

interface Props {
  filtroBusca?: string;
  filtroResponsaveis?: string[];
  apenasMinhas?: boolean;
  currentUserId?: string | null;
  filtroStatusGlobal?: string;
  onAbrirHistorico?: (clienteId: string) => void;
  acoesSlot?: (clienteId: string) => React.ReactNode;
}

export function ClientesGeralTable({
  filtroBusca = "",
  filtroResponsaveis = [],
  apenasMinhas = false,
  currentUserId = null,
  filtroStatusGlobal = "todos",
  onAbrirHistorico,
  acoesSlot,
}: Props) {
  const { clientes, responsaveis, cards, contratos, nichos } = useCRM();
  const demandas = useDemandas((s) => s.demandas);

  const respsPostsPorCliente = useMemo(() => {
    const map = new Map<string, Set<string>>();
    cards.forEach((card) => {
      let set = map.get(card.cliente_id);
      if (!set) { set = new Set<string>(); map.set(card.cliente_id, set); }
      (card.responsaveis ?? []).forEach((r) => set!.add(r));
    });
    return map;
  }, [cards]);

  const linhas = useMemo(() => {
    const termo = filtroBusca.trim().toLowerCase();
    let lista = clientes.filter((c) => {
      if (
        filtroStatusGlobal !== "todos" &&
        (c.status_global ?? "Onboarding") !== filtroStatusGlobal
      )
        return false;
      if (filtroResponsaveis.length > 0) {
        const respsPosts = respsPostsPorCliente.get(c.id);
        if (!respsPosts || !filtroResponsaveis.some((r) => respsPosts.has(r))) return false;
      }
      if (apenasMinhas && currentUserId) {
        const respsPosts = respsPostsPorCliente.get(c.id);
        if (!respsPosts || !respsPosts.has(currentUserId)) return false;
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

    lista = [...lista].sort((a, b) =>
      a.nome_cliente.localeCompare(b.nome_cliente, "pt-BR", {
        sensitivity: "base",
      }),
    );
    return lista;
  }, [
    clientes,
    filtroBusca,
    filtroResponsaveis,
    apenasMinhas,
    currentUserId,
    filtroStatusGlobal,
    respsPostsPorCliente,
  ]);

  return (
    <div className="space-y-1.5">
      <Card>
        <CardContent className="p-0">
          {linhas.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado
            </div>
          ) : (
            <div className="overflow-auto">
              <Table className="[&_th]:py-1 [&_th]:px-2 [&_th]:h-7 [&_td]:py-1 [&_td]:px-2">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-xs text-muted-foreground">
                      #
                    </TableHead>
                    <TableHead className="min-w-[180px]">Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Responsáveis</TableHead>
                    <TableHead className="min-w-[180px]">
                      Último comentário
                    </TableHead>
                    <TableHead>Nicho</TableHead>
                    <TableHead>Período do contrato</TableHead>
                    <TableHead className="text-center">Posts</TableHead>
                    <TableHead className="text-center">Demandas</TableHead>
                    <TableHead className="min-w-[140px]">Observações</TableHead>
                    {acoesSlot && (
                      <TableHead className="text-right">Ações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((cliente, idx) => {
                    const respObjs = responsaveis.filter((r) =>
                      cliente.responsaveis.includes(r.id),
                    );
                    const cardsCli = cards.filter(
                      (k) => k.cliente_id === cliente.id,
                    );
                    const contrato = contratos.find(
                      (c) => c.cliente_id === cliente.id,
                    );
                    const totalPosts =
                      contrato?.total_posts ?? cardsCli.length;
                    const postados = cardsCli.filter(
                      (k) => k.status_card === "Postado",
                    ).length;
                    const atrasados = cardsCli.filter(
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

                    const nichoOpt = nichos.find(
                      (n) => n.label === cliente.nicho,
                    );

                    return (
                      <TableRow
                        key={cliente.id}
                        className="hover:bg-accent/30"
                      >
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
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <CelulaResponsaveis
                            clienteId={cliente.id}
                            ids={cliente.responsaveis}
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
                            <ColorBadge
                              label={nichoOpt.label}
                              color={nichoOpt.cor}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {cliente.data_inicio_contrato ? (
                            <>
                              {new Date(
                                cliente.data_inicio_contrato,
                              ).toLocaleDateString("pt-BR")}
                              {" → "}
                              {cliente.data_fim_contrato
                                ? new Date(
                                    cliente.data_fim_contrato,
                                  ).toLocaleDateString("pt-BR")
                                : "—"}
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col leading-tight tabular-nums">
                            <span className="text-xs font-medium">
                              {postados}/{totalPosts}
                            </span>
                            {atrasados > 0 && (
                              <span className="text-[10px] text-destructive font-semibold">
                                ⚠ {atrasados}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs font-semibold tabular-nums">
                              {demandasCli.length}
                            </span>
                            {demAtrasadas > 0 && (
                              <Badge
                                variant="destructive"
                                className="gap-0.5 h-4 px-1 text-[10px]"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {demAtrasadas}
                              </Badge>
                            )}
                            {demUrgentes > 0 && (
                              <Badge className="gap-0.5 h-4 px-1 text-[10px] bg-status-renovacao text-white">
                                <Zap className="h-2.5 w-2.5" />
                                {demUrgentes}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          <span
                            className="block truncate max-w-[160px]"
                            title={cliente.observacoes}
                          >
                            {cliente.observacoes || "—"}
                          </span>
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
  );
}
