import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemandas } from "@/store/demandas";
import { useCRM } from "@/store/crm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarStack } from "@/components/AvatarStack";
import { ArrowRight, AlertTriangle, Zap } from "lucide-react";
import {
  STATUS_DEMANDA,
  STATUS_DEMANDA_LABEL,
  PRIORIDADES,
  PRIORIDADE_LABEL,
} from "@/lib/demandas-categorias";

export function ClientesDemandasTable() {
  const demandas = useDemandas((s) => s.demandas);
  const { clientes, responsaveis } = useCRM();
  const navigate = useNavigate();

  const [busca, setBusca] = useState("");
  const [fResp, setFResp] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");
  const [fPrio, setFPrio] = useState("todas");

  const linhas = useMemo(() => {
    const filtroAtivo =
      fResp !== "todos" || fStatus !== "todos" || fPrio !== "todas";

    const filtradas = demandas.filter((d) => {
      if (fResp !== "todos" && d.responsavel_id !== fResp) return false;
      if (fStatus !== "todos" && d.status !== fStatus) return false;
      if (fPrio !== "todas" && d.prioridade !== fPrio) return false;
      return true;
    });

    const map = new Map<
      string,
      {
        cliente_id: string;
        nome: string;
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
      map.set(c.id, {
        cliente_id: c.id,
        nome: c.nome_cliente,
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
      const cur =
        map.get(d.cliente_id) ?? {
          cliente_id: d.cliente_id,
          nome: "Cliente removido",
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

    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter((l) => l.nome.toLowerCase().includes(q));
    }

    // Ordena: primeiro com atividade mais recente, sem demandas vão pelo created_at do cliente
    lista.sort(
      (a, b) => +new Date(b.ultimaAtividade) - +new Date(a.ultimaAtividade),
    );
    return lista;
  }, [demandas, clientes, busca, fResp, fStatus, fPrio]);

  return (
    <div className="space-y-1.5">
      <Card>
        <CardContent className="p-2 flex flex-wrap items-center gap-1.5">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-56 h-9"
          />
          <Select value={fResp} onValueChange={setFResp}>
            <SelectTrigger className="h-9 w-48">
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
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {STATUS_DEMANDA.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_DEMANDA_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fPrio} onValueChange={setFPrio}>
            <SelectTrigger className="h-9 w-44">
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
        </CardContent>
      </Card>

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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Responsáveis</TableHead>
                  <TableHead>Última atividade</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Atrasadas</TableHead>
                  <TableHead className="text-center">Urgentes</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => {
                  const respObjs = responsaveis.filter((r) =>
                    l.responsaveisIds.has(r.id)
                  );
                  return (
                    <TableRow
                      key={l.cliente_id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/demandas/cliente/${l.cliente_id}`)}
                    >
                      <TableCell className="font-medium">{l.nome}</TableCell>
                      <TableCell>
                        {respObjs.length > 0 ? (
                          <AvatarStack responsaveis={respObjs} size="xs" max={4} />
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
    </div>
  );
}
