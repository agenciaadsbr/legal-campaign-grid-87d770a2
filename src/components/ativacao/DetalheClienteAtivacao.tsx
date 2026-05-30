import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ExternalLink, MoreVertical } from "lucide-react";
import { useCRM } from "@/store/crm";
import { useCardPai } from "@/store/cardPai";
import { modulosDoCliente, isEtapaResolvida } from "@/lib/ativacaoRules";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { AtivacaoLinha } from "@/hooks/useOnboardingProgress";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  linha: AtivacaoLinha | null;
  onAtualizou?: () => void;
}

export function DetalheClienteAtivacao({ open, onOpenChange, linha, onAtualizou }: Props) {
  const navigate = useNavigate();
  const responsaveis = useCRM((s) => s.responsaveis);
  const atualizarEtapa = useCardPai((s) => s.atualizarEtapa);
  const respMap = new Map(responsaveis.map((r) => [r.id, r]));

  if (!linha) return null;
  const modulos = modulosDoCliente(linha.cardsPai, linha.etapas);

  const marcar = async (etapaId: string, valor: "ja_existente" | "nao_aplicavel") => {
    await atualizarEtapa(etapaId, { status_interno_valor: valor, concluido: true, concluido_em: new Date().toISOString() } as any);
    toast.success(valor === "ja_existente" ? "Etapa marcada como já existente" : "Etapa marcada como não aplicável");
    onAtualizou?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground">{linha.cliente.nome_cliente}</SheetTitle>
          <SheetDescription>
            Visão da ativação do cliente — dados em tempo real.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Resumo label="Dias" value={`${linha.diasOnboarding}d`} highlight={linha.diasOnboarding > 30} />
            <Resumo label="Progresso" value={`${linha.progresso.pct}%`} />
            <Resumo label="Risco" value={linha.risco} />
            <Resumo label="Status" value={linha.statusPrincipal} small />
          </div>

          {linha.badgeAtual && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Badge atual:</span>
              <Badge variant="outline">{linha.badgeAtual}</Badge>
            </div>
          )}

          {/* Módulos / Cards Pai */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Módulos (Cards Pai)</h3>
            {modulos.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
                Nenhum Card Pai cadastrado para este cliente.
              </div>
            ) : (
              <div className="space-y-2">
                {modulos.map((m) => (
                  <div key={m.card.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{m.card.titulo}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <Progress value={m.pct} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {m.resolvidas}/{m.total} · {m.pct}%
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{m.card.status_geral}</Badge>
                    </div>
                    {m.etapaAtual && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Etapa atual: <span className="text-foreground">{m.etapaAtual.titulo}</span>
                        {m.etapaAtual.responsavel_id && (
                          <> · {respMap.get(m.etapaAtual.responsavel_id)?.nome ?? ""}</>
                        )}
                      </div>
                    )}
                    {/* Lista etapas com menu "já existente / não aplicável" */}
                    <ul className="mt-2 space-y-1">
                      {linha.etapas
                        .filter((e) => e.card_pai_id === m.card.id)
                        .map((e) => (
                          <li key={e.id} className="flex items-center justify-between text-xs">
                            <span className={isEtapaResolvida(e) ? "text-emerald-600 dark:text-emerald-400 line-through" : "text-foreground"}>
                              {e.titulo}
                              {e.status_interno_valor === "ja_existente" && " (já existente)"}
                              {e.status_interno_valor === "nao_aplicavel" && " (não aplicável)"}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => marcar(e.id, "ja_existente")}>
                                  Marcar como já existente
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => marcar(e.id, "nao_aplicavel")}>
                                  Marcar como não aplicável
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pendências para ativar */}
          {(linha.pendenciasRegra.length > 0 || linha.pendenciasCriticas.length > 0) && (
            <div className="rounded-md border border-border bg-muted/10 p-3">
              <h3 className="text-sm font-semibold text-foreground mb-2">Pendências para ativação</h3>
              {linha.pendenciasRegra.length > 0 && (
                <div className="text-xs text-muted-foreground mb-2">
                  Regras: {linha.pendenciasRegra.join(", ")}
                </div>
              )}
              {linha.pendenciasCriticas.length > 0 && (
                <ul className="text-xs text-destructive space-y-0.5">
                  {linha.pendenciasCriticas.map((p) => <li key={p}>• {p}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Motivos do risco */}
          {linha.motivosRisco.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Motivos do risco</h3>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {linha.motivosRisco.slice(0, 6).map((m, i) => <li key={i}>• {m}</li>)}
              </ul>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/clientes/${linha.cliente.id}/projeto`)}>
              <ExternalLink className="h-3.5 w-3.5 mr-2" />
              Abrir projeto completo
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Resumo({ label, value, highlight, small }: { label: string; value: string; highlight?: boolean; small?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card p-2.5">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 ${small ? "text-sm" : "text-lg"} font-semibold ${highlight ? "text-destructive" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}
