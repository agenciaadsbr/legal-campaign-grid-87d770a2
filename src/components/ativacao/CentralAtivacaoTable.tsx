import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCRM } from "@/store/crm";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AtivacaoLinha } from "@/hooks/useOnboardingProgress";

interface Props {
  linhas: AtivacaoLinha[];
  onAbrirDetalhe: (l: AtivacaoLinha) => void;
  onMarcarAtivo: (l: AtivacaoLinha) => void;
}

function RiscoBadge({ r }: { r: AtivacaoLinha["risco"] }) {
  if (r === "Critico")
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/15">Crítico</Badge>;
  if (r === "Atencao")
    return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/15 dark:text-amber-400">Atenção</Badge>;
  return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15 dark:text-emerald-400">OK</Badge>;
}

export function CentralAtivacaoTable({ linhas, onAbrirDetalhe, onMarcarAtivo }: Props) {
  const navigate = useNavigate();
  const responsaveis = useCRM((s) => s.responsaveis);
  const respMap = new Map(responsaveis.map((r) => [r.id, r]));

  if (linhas.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-12 text-center text-sm text-muted-foreground">
        Nenhum cliente em onboarding com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">Cliente</TableHead>
            <TableHead>Dias</TableHead>
            <TableHead className="min-w-[140px]">Progresso</TableHead>
            <TableHead>Status principal</TableHead>
            <TableHead>Badge atual</TableHead>
            <TableHead>Próximo bloqueio</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Risco</TableHead>
            <TableHead>Último avanço</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((l) => {
            const resp = l.responsavelAtualId ? respMap.get(l.responsavelAtualId) : null;
            return (
              <TableRow key={l.cliente.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => onAbrirDetalhe(l)}>
                <TableCell className="font-medium text-foreground">{l.cliente.nome_cliente}</TableCell>
                <TableCell>
                  <span className={l.diasOnboarding > 30 ? "text-destructive font-medium" : "text-foreground"}>
                    {l.diasOnboarding}d
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={l.progresso.pct} className="h-1.5 w-24" />
                    <span className="text-xs text-muted-foreground tabular-nums">{l.progresso.pct}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{l.statusPrincipal}</TableCell>
                <TableCell>
                  {l.badgeAtual ? (
                    <Badge variant="outline" className="text-[10px]">{l.badgeAtual}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {l.proximoBloqueio ?? "—"}
                </TableCell>
                <TableCell className="text-sm">{resp?.nome ?? "—"}</TableCell>
                <TableCell><RiscoBadge r={l.risco} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.ultimoAvanco ? formatDistanceToNow(new Date(l.ultimoAvanco), { locale: ptBR, addSuffix: true }) : "—"}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/clientes/${l.cliente.id}/projeto`)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant={l.podeAtivar ? "default" : "outline"}
                      onClick={() => onMarcarAtivo(l)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Ativar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
