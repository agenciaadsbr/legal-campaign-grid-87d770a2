import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ExternalLink, MoreVertical, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useCRM } from "@/store/crm";
import { useCardPai } from "@/store/cardPai";
import { useAtividades } from "@/store/atividades";
import {
  isEtapaResolvida,
  modulosDoCliente,
  isStatusResolvido,
  META_ATIVACAO_DIAS,
} from "@/lib/ativacaoRules";
import { canonicalStatus } from "@/lib/demandas-categorias";
import { StatusVisualBadge } from "@/components/ativacao/StatusVisualBadge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useEffect, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  const respMap = useMemo(() => new Map(responsaveis.map((r) => [r.id, r])), [responsaveis]);
  const atividadesPorCliente = useAtividades((s) => s.porCliente);
  const loadAtividades = useAtividades((s) => s.loadByCliente);

  useEffect(() => {
    if (open && linha?.cliente.id) {
      loadAtividades(linha.cliente.id, { reset: true });
    }
  }, [open, linha?.cliente.id, loadAtividades]);

  if (!linha) return null;
  const modulos = modulosDoCliente(linha.cardsPai, linha.etapas);
  const atividades = atividadesPorCliente[linha.cliente.id] ?? [];
  const respAtual = linha.responsavelAtualId ? respMap.get(linha.responsavelAtualId) : null;

  const marcar = async (etapaId: string, valor: "ja_existente" | "nao_aplicavel") => {
    await atualizarEtapa(etapaId, {
      status_interno_valor: valor,
      concluido: true,
      concluido_em: new Date().toISOString(),
    } as any);
    toast.success(valor === "ja_existente" ? "Etapa marcada como já existente" : "Etapa marcada como não aplicável");
    onAtualizou?.();
  };

  // ===== ALERTAS =====
  const alertas: { tipo: string; descricao: string; relacionado?: string; responsavel?: string; dias?: number }[] = [];
  if (linha.diasOnboarding > META_ATIVACAO_DIAS) {
    alertas.push({
      tipo: "Onboarding atrasado",
      descricao: `Cliente está há ${linha.diasOnboarding} dias no onboarding (meta: ${META_ATIVACAO_DIAS} dias).`,
    });
  }
  for (const d of linha.demandas) {
    if (isStatusResolvido(d.status)) continue;
    const s = canonicalStatus(d.status);
    const respId = d.responsavel_id || d.responsaveis_ids?.[0];
    const respNome = respId ? respMap.get(respId)?.nome : undefined;
    const diasParado = d.updated_at
      ? Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86_400_000)
      : 0;

    if (s === "Atrasado") {
      alertas.push({ tipo: "Tarefa atrasada", descricao: d.titulo, relacionado: d.id, responsavel: respNome, dias: diasParado });
    }
    if (s === "Aguardando ação do cliente") {
      alertas.push({ tipo: "Aguardando ação do cliente", descricao: d.titulo, relacionado: d.id, responsavel: respNome, dias: diasParado });
    }
    if (s === "Aguardando aprovação do cliente") {
      alertas.push({ tipo: "Aguardando aprovação do cliente", descricao: d.titulo, relacionado: d.id, responsavel: respNome, dias: diasParado });
    }
    if ((d.responsaveis_ids?.length ?? 0) === 0 && !d.responsavel_id) {
      alertas.push({ tipo: "Sem responsável", descricao: d.titulo, relacionado: d.id });
    }
    if (!d.data_limite) {
      alertas.push({ tipo: "Sem prazo", descricao: d.titulo, relacionado: d.id, responsavel: respNome });
    }
    if (d.status_motivo) {
      alertas.push({ tipo: "Badge pendente", descricao: `${d.status_motivo} — ${d.titulo}`, relacionado: d.id, responsavel: respNome, dias: diasParado });
    }
  }
  for (const e of linha.etapas) {
    if (isEtapaResolvida(e)) continue;
    const card = linha.cardsPai.find((c) => c.id === e.card_pai_id);
    if (e.tipo === "tarefa_real" && !e.responsavel_id) {
      alertas.push({ tipo: "Etapa sem responsável", descricao: `${card?.titulo ?? "Card Pai"} — ${e.titulo}` });
    }
  }

  // ===== TIMELINE =====
  const timeline = [...atividades]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-foreground flex items-center gap-2 flex-wrap">
                {linha.cliente.nome_cliente}
                <StatusVisualBadge status={linha.statusVisual} />
              </SheetTitle>
              <div className="mt-1 text-xs text-muted-foreground">
                {linha.cliente.data_inicio_onboarding
                  ? `Onboarding desde ${new Date(linha.cliente.data_inicio_onboarding).toLocaleDateString("pt-BR")} (${linha.diasOnboarding} dias)`
                  : `${linha.diasOnboarding} dias em onboarding`}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Cards superiores */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card2 label="Progresso geral" value={`${linha.progresso.pct}%`}>
            <Progress value={linha.progresso.pct} className="h-1.5 mt-2" />
          </Card2>
          <Card2 label="Dias no onboarding" value={`${linha.diasOnboarding} dias`} />
          <Card2
            label="Dias restantes"
            value={linha.diasRestantes < 0 ? `${linha.diasRestantes} dias` : `${linha.diasRestantes} dias`}
            danger={linha.diasRestantes < 0}
            warning={linha.diasRestantes >= 0 && linha.diasRestantes <= 2}
          >
            <div className="text-[10px] text-muted-foreground mt-1">Meta: {META_ATIVACAO_DIAS} dias</div>
          </Card2>
          <Card2 label="Risco" value={linha.risco === "Critico" ? "Crítico" : linha.risco === "Atencao" ? "Atenção" : "OK"} danger={linha.risco === "Critico"} />
          <Card2 label="Próximo bloqueio" value={linha.proximoBloqueio} small />
          <Card2 label="Responsável atual" value={respAtual?.nome ?? "—"} small />
        </div>

        <Tabs defaultValue="visao" className="mt-5">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto">
            <TabsTrigger value="visao" className="text-xs">Visão Geral</TabsTrigger>
            <TabsTrigger value="cards" className="text-xs">Cards Pai</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">Linha do Tempo</TabsTrigger>
            <TabsTrigger value="tarefas" className="text-xs">Tarefas</TabsTrigger>
            <TabsTrigger value="alertas" className="text-xs">
              Alertas {alertas.length > 0 && <span className="ml-1 text-destructive">({alertas.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="atividades" className="text-xs">Atividades</TabsTrigger>
          </TabsList>

          {/* ============ VISÃO GERAL ============ */}
          <TabsContent value="visao" className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Módulos de Ativação</h3>
              {modulos.length === 0 ? (
                <div className="rounded-md border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
                  Nenhum Card Pai cadastrado para este cliente.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {modulos.map((m) => {
                    const respEtapa = m.etapaAtual?.responsavel_id
                      ? respMap.get(m.etapaAtual.responsavel_id)
                      : null;
                    return (
                      <div key={m.card.id} className="rounded-md border border-border bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-foreground truncate">{m.card.titulo}</div>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {m.pct}%
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {m.resolvidas}/{m.total} etapas concluídas
                        </div>
                        <Progress value={m.pct} className="h-1.5 mt-2" />
                        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {m.card.status_geral}
                          </Badge>
                          {respEtapa && (
                            <span className="text-[10px] text-muted-foreground">
                              {respEtapa.nome}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {linha.badgeAtual && (
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Badge atual</div>
                <div className="mt-1">
                  <Badge variant="outline">{linha.badgeAtual}</Badge>
                </div>
              </div>
            )}

            {linha.ultimoAvanco && (
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-[10px] uppercase text-muted-foreground">Último avanço</div>
                <div className="mt-1 text-sm text-foreground">
                  {formatDistanceToNow(new Date(linha.ultimoAvanco), { locale: ptBR, addSuffix: true })}
                </div>
              </div>
            )}

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
                    {linha.pendenciasCriticas.map((p) => (
                      <li key={p}>• {p}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </TabsContent>

          {/* ============ CARDS PAI ============ */}
          <TabsContent value="cards" className="mt-4 space-y-3">
            {modulos.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
                Nenhum Card Pai cadastrado para este cliente.
              </div>
            ) : (
              modulos.map((m) => {
                const respEtapa = m.etapaAtual?.responsavel_id
                  ? respMap.get(m.etapaAtual.responsavel_id)
                  : null;
                return (
                  <div key={m.card.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">{m.card.titulo}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <Progress value={m.pct} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {m.resolvidas}/{m.total} · {m.pct}%
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {m.card.status_geral}
                      </Badge>
                    </div>
                    {m.etapaAtual && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Etapa atual: <span className="text-foreground">{m.etapaAtual.titulo}</span>
                        {respEtapa && <> · {respEtapa.nome}</>}
                      </div>
                    )}
                    <ul className="mt-2 space-y-1">
                      {linha.etapas
                        .filter((e) => e.card_pai_id === m.card.id)
                        .sort((a, b) => a.ordem - b.ordem)
                        .map((e) => (
                          <li key={e.id} className="flex items-center justify-between text-xs">
                            <span
                              className={
                                isEtapaResolvida(e)
                                  ? "text-emerald-600 dark:text-emerald-400 line-through"
                                  : "text-foreground"
                              }
                            >
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
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => navigate(`/clientes/${linha.cliente.id}/projeto`)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir Card Pai
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* ============ LINHA DO TEMPO ============ */}
          <TabsContent value="timeline" className="mt-4">
            {timeline.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
                Sem eventos no histórico.
              </div>
            ) : (
              <ul className="space-y-2.5">
                {timeline.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-foreground">
                        {a.descricao ?? `${a.tipo} · ${a.acao}`}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleString("pt-BR")}
                        {a.area && ` · ${a.area}`}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* ============ TAREFAS ============ */}
          <TabsContent value="tarefas" className="mt-4">
            <div className="rounded-md border border-border bg-card overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">Tarefa</th>
                    <th className="text-left p-2">Área</th>
                    <th className="text-left p-2">Responsável</th>
                    <th className="text-left p-2">Prazo</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {linha.demandas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">
                        Sem tarefas vinculadas a este cliente.
                      </td>
                    </tr>
                  )}
                  {linha.demandas.map((d) => {
                    const respId = d.responsavel_id || d.responsaveis_ids?.[0];
                    const resp = respId ? respMap.get(respId) : null;
                    return (
                      <tr key={d.id} className="border-t border-border">
                        <td className="p-2 text-foreground">{d.titulo}</td>
                        <td className="p-2 text-muted-foreground">{d.categoria}</td>
                        <td className="p-2 text-muted-foreground">{resp?.nome ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">
                          {d.data_limite ? new Date(d.data_limite).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[10px]">{canonicalStatus(d.status)}</Badge>
                        </td>
                        <td className="p-2">
                          {d.status_motivo ? (
                            <Badge variant="outline" className="text-[10px]">{d.status_motivo}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ============ ALERTAS E TRAVAS ============ */}
          <TabsContent value="alertas" className="mt-4 space-y-2">
            {alertas.length === 0 ? (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Nenhum alerta ativo para este cliente.
              </div>
            ) : (
              alertas.map((a, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-border bg-card p-3 flex items-start gap-3"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground">{a.tipo}</div>
                    <div className="text-xs text-muted-foreground">{a.descricao}</div>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                      {a.responsavel && <span>👤 {a.responsavel}</span>}
                      {typeof a.dias === "number" && a.dias > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Travado há {a.dias} {a.dias === 1 ? "dia" : "dias"}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 shrink-0"
                    onClick={() => navigate(`/clientes/${linha.cliente.id}/projeto`)}
                  >
                    Abrir projeto
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          {/* ============ ATIVIDADES ============ */}
          <TabsContent value="atividades" className="mt-4">
            {atividades.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
                Sem atividades recentes.
              </div>
            ) : (
              <ul className="space-y-2">
                {atividades.slice(0, 50).map((a) => (
                  <li key={a.id} className="rounded-md border border-border bg-card p-2.5">
                    <div className="text-xs text-foreground">
                      {a.descricao ?? `${a.tipo} · ${a.acao}`}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                      {a.area && ` · ${a.area}`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/clientes/${linha.cliente.id}/projeto`)}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-2" />
            Abrir Projeto Completo
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Card2({
  label,
  value,
  small,
  danger,
  warning,
  children,
}: {
  label: string;
  value: string;
  small?: boolean;
  danger?: boolean;
  warning?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div
        className={`mt-1 font-semibold ${small ? "text-xs" : "text-lg"} ${
          danger
            ? "text-destructive"
            : warning
            ? "text-orange-600 dark:text-orange-400"
            : "text-foreground"
        } ${small ? "line-clamp-2" : ""}`}
      >
        {value}
      </div>
      {children}
    </div>
  );
}
