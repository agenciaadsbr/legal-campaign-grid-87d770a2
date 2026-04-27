import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemandas } from "@/store/demandas";
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

import { StatusClienteBadge } from "@/components/StatusClienteBadge";
import { CelulaResponsaveis } from "@/components/clientes/CelulaResponsaveis";
import { ArrowRight, AlertTriangle, Zap } from "lucide-react";

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
  const { clientes, nichos } = useCRM();
  const navigate = useNavigate();
  const [historicoClienteId, setHistoricoClienteId] = useState<string | null>(null);

  const linhas = useMemo(() => {
    const filtroAtivo =
      filtroResp !== "todos" || filtroStatus !== "todos" || filtroPrio !== "todas";

    // Clientes que possuem o responsável atribuído no próprio cadastro do cliente
    const clienteIdsComRespNoCard = new Set(
      filtroResp !== "todos"
        ? clientes
            .filter((c) => (c.responsaveis ?? []).includes(filtroResp))
            .map((c) => c.id)
        : [],
    );

    const filtradas = demandas.filter((d) => {
      if (filtroResp !== "todos") {
        const matchDemanda = d.responsavel_id === filtroResp;
        const matchCliente = clienteIdsComRespNoCard.has(d.cliente_id);
        if (!matchDemanda && !matchCliente) return false;
      }
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
        temDemanda: boolean;
      }
    >();

    // 1) Inicializa com TODOS os clientes cadastrados (responsáveis vindos do próprio cliente)
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
        responsaveisIds: new Set<string>(c.responsaveis ?? []),
        ultimaAtividade: c.created_at,
        total: 0,
        atrasadas: 0,
        urgentes: 0,
        temDemanda: false,
      });
    });

    // 2) Agrega métricas das demandas filtradas
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
        temDemanda: false,
      };
      cur.total += 1;
      cur.temDemanda = true;
      if (d.status === "Atrasado") cur.atrasadas += 1;
      if (d.prioridade === "Urgente") cur.urgentes += 1;
      if (d.responsavel_id) cur.responsaveisIds.add(d.responsavel_id);
      if (new Date(d.updated_at) > new Date(cur.ultimaAtividade)) {
        cur.ultimaAtividade = d.updated_at;
      }
      map.set(d.cliente_id, cur);
    });

    let lista = Array.from(map.values());

    // Quando há filtro de demanda ativo, ocultar clientes sem demandas que correspondam
    if (filtroAtivo) {
      lista = lista.filter((l) => l.temDemanda);
    }

    if (filtroBusca.trim()) {
      const q = filtroBusca.toLowerCase();
      lista = lista.filter((l) => l.nome.toLowerCase().includes(q));
    }

    // Ordena alfabeticamente A → Z (case/acento insensível, pt-BR)
    lista.sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
    );
    return lista;
  }, [demandas, clientes, filtroBusca, filtroResp, filtroStatus, filtroPrio, filtroStatusGlobal]);

  return (
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
                  <TableHead>Responsáveis</TableHead>
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
                  const idsCliente = clienteAtual?.responsaveis ?? [];
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <CelulaResponsaveis
                          clienteId={l.cliente_id}
                          ids={idsCliente}
                        />
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
                          <Badge variant="destructive" className="gap-1 h-5 px-1.5 text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            {l.atrasadas}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {l.urgentes > 0 ? (
                          <Badge className="gap-1 h-5 px-1.5 text-xs bg-status-renovacao text-white">
                            <Zap className="h-3 w-3" />
                            {l.urgentes}
                          </Badge>
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
  );
}
