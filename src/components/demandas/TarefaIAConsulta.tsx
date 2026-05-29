import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Send,
  ChevronDown,
  ChevronUp,
  Copy,
  MessageSquarePlus,
  Clock,
  Bot,
  User as UserIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useIAConsultas } from "@/store/iaConsultas";
import { useReunioes } from "@/store/reunioes";
import { useCRM } from "@/store/crm";
import { useDemandas } from "@/store/demandas";
import { useResumoViews } from "@/store/resumoViews";
import { useAuth } from "@/hooks/useAuth";
import { Demanda } from "@/store/demandas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ReuniaoDialog } from "@/components/projeto/ReuniaoDialog";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  demanda: Demanda;
  comentarios_texto?: string;
  onAddComment?: (text: string) => void;
}

const RESPOSTA_LIMITE = 280;

export function TarefaIAConsulta({ demanda, comentarios_texto, onAddComment }: Props) {

  const [isOpen, setIsOpen] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const [verResumoOpen, setVerResumoOpen] = useState(false);
  const [reunioesLoaded, setReunioesLoaded] = useState(false);

  const {
    consultarIA,
    loading,
    tarefaConsultas,
    loadConsultasByDemanda,
  const { reunioes, load: loadReunioes } = useReunioes();
  const { clientes, authoresPorAuthId, responsaveis } = useCRM();
  const { user } = useAuth();
  const { views, load: loadViews, registrar: registrarView, getMinha } = useResumoViews();

  const cliente = clientes.find((c) => c.id === demanda.cliente_id);
  const clienteNome = (cliente as any)?.nome_cliente || (cliente as any)?.nome || "Cliente";

  const reuniaoSelecionada = useMemo(() => {
    const lista = reunioes.filter((r) => r.cliente_id === demanda.cliente_id);
    const vinculada = (demanda as any).origem_reuniao_id
      ? lista.find((r) => r.id === (demanda as any).origem_reuniao_id)
      : null;
    if (vinculada) return vinculada;
    return [...lista].sort((a, b) => (a.data < b.data ? 1 : -1))[0] || null;
  }, [reunioes, demanda]);

  const minhaView = user ? getMinha(demanda.id, user.id) : undefined;
  const ultimaVisualizacao = useMemo(() => {
    const lista = views[demanda.id] || [];
    if (!lista.length) return null;
    return [...lista].sort((a, b) => (a.last_viewed_at < b.last_viewed_at ? 1 : -1))[0];
  }, [views, demanda.id]);

  const nomeViewer = (uid: string) => {
    const resp = responsaveis.find((r) => (r as any).auth_user_id === uid || r.id === uid);
    if (resp) return resp.nome;
    return authoresPorAuthId?.[uid]?.nome || "Usuário";
  };

  const formatViewedAt = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return iso;
    }
  };

      ? lista.find((r) => r.id === (demanda as any).origem_reuniao_id)
      : null;
    if (vinculada) return vinculada;
    return [...lista].sort((a, b) => (a.data < b.data ? 1 : -1))[0] || null;
  }, [reunioes, demanda]);

  useEffect(() => {
    let cancelado = false;
    if (isOpen) {
      setReady(false);
      (async () => {
        try {
          await Promise.all([
            loadSetorPrompts(),
            loadReunioes(),
            loadConsultasByDemanda(demanda.id),
          ]);
        } finally {
          if (!cancelado) setReady(true);
        }
      })();
    }
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, demanda.id]);

  const handleConsultar = async () => {
    if (!pergunta.trim() || loading || !ready) return;

    const cliente = clientes.find(c => c.id === demanda.cliente_id);
    const reunioesCliente = reunioes.filter(r => r.cliente_id === demanda.cliente_id);
    const promptSetor = setorPrompts.find(p => p.setor === demanda.categoria)?.prompt;

    if (reunioesCliente.length === 0) {
      toast.info("Este cliente ainda não tem reuniões cadastradas. A IA usará apenas o briefing.");
    }

    const res = await consultarIA({
      demanda_id: demanda.id,
      pergunta,
      cliente_nome: cliente?.nome_cliente || "Desconhecido",
      tarefa_titulo: demanda.titulo,
      tarefa_categoria: demanda.categoria,
      tarefa_subtipo: demanda.subtipo,
      tarefa_prioridade: demanda.prioridade,
      tarefa_descricao: demanda.descricao,
      tarefa_comentarios: comentarios_texto || "",
      reunioes: reunioesCliente.map(r => ({
        titulo: r.titulo,
        data: r.data,
        tipo: r.tipo,
        transcricao: r.transcricao,
        resumo_operacional: r.resumo_tarefas,
        resumo_cliente: r.resumo_cliente,
        observacoes: r.observacoes
      })),
      setor_prompt: promptSetor
    });

    if (res) {
      setResposta(res);
      setPergunta("");
    }
    // Em caso de erro mantém a pergunta para o usuário tentar de novo
  };

  const handleCopy = () => {
    if (!resposta?.resposta) return;
    navigator.clipboard.writeText(resposta.resposta);
    toast.success("Resposta copiada!");
  };

  const handleAddAsComment = () => {
    if (!resposta?.resposta || !onAddComment) return;
    onAddComment(`**Consulta IA:** ${resposta.resposta}`);
    toast.success("Resposta adicionada como comentário!");
  };

  const nomeUsuario = (uid?: string | null) => {
    if (!uid) return "Sistema";
    return authoresPorAuthId?.[uid]?.nome || "Usuário";
  };

  const corConfianca = (n?: string | null) =>
    n === "Alto"
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
      : n === "Médio"
      ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
      : "text-destructive bg-destructive/10 border-destructive/30";

  return (
    <div className="mt-2 border-t pt-2">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between hover:bg-primary/5 text-primary h-8"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide">
          <Sparkles className="h-3.5 w-3.5" />
          Está com dúvidas na tarefa? Consulte aqui
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {isOpen && (
        <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <Card className="bg-muted/30 border-primary/20">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold">Consultar dúvida sobre esta tarefa</span>
              </div>
              
              <div className="flex gap-2">
                <Textarea
                  placeholder="Digite aqui sua dúvida... (Ex: Quais temas o cliente quer postar?)"
                  value={pergunta}
                  onChange={(e) => setPergunta(e.target.value)}
                  disabled={!ready || loading}
                  className="text-xs min-h-[60px] resize-none bg-background"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleConsultar();
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground">
                  {!ready ? "Carregando reuniões do cliente…" : ""}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!reunioesLoaded) {
                        await loadReunioes();
                        setReunioesLoaded(true);
                      }
                      const lista = useReunioes.getState().reunioes.filter((r) => r.cliente_id === demanda.cliente_id);
                      const vinculada = (demanda as any).origem_reuniao_id
                        ? lista.find((r) => r.id === (demanda as any).origem_reuniao_id)
                        : null;
                      const alvo = vinculada || [...lista].sort((a, b) => (a.data < b.data ? 1 : -1))[0];
                      if (!alvo) {
                        toast.info("Nenhuma reunião encontrada para este cliente.");
                        return;
                      }
                      setVerResumoOpen(true);
                    }}
                    className="h-8 gap-2"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Ver resumo da reunião
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConsultar}
                    disabled={loading || !ready || !pergunta.trim()}
                    className="h-8 gap-2"
                  >
                    {loading ? (
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {loading ? "Consultando..." : "Consultar IA"}
                  </Button>
                </div>
              </div>


              {resposta && (
                <div className="mt-3 p-3 rounded-lg bg-background border space-y-2 animate-in zoom-in-95 duration-200">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Resposta</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy} title="Copiar">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddAsComment} title="Adicionar como comentário">
                        <MessageSquarePlus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{resposta.resposta}</p>
                  
                  {resposta.fontes?.length > 0 && (
                    <div className="pt-2 border-t mt-2">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Fontes encontradas</span>
                      <div className="flex flex-wrap gap-1">
                        {resposta.fontes.map((f: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[9px] py-0 h-4 bg-muted/50">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {resposta.nivel_confianca && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Confiança:</span>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", corConfianca(resposta.nivel_confianca))}>
                        {resposta.nivel_confianca}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico */}
          {tarefaConsultas.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase text-muted-foreground px-1">Histórico de consultas</span>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {tarefaConsultas.map((c) => {
                  const longa = (c.resposta?.length || 0) > RESPOSTA_LIMITE;
                  const aberto = !!expandido[c.id];
                  const textoResposta = longa && !aberto
                    ? c.resposta.slice(0, RESPOSTA_LIMITE) + "…"
                    : c.resposta;
                  return (
                    <div key={c.id} className="p-2.5 rounded border bg-muted/20 text-[11px] space-y-1.5">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground">Pergunta</span>
                        <p className="font-semibold text-foreground leading-snug">{c.pergunta}</p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground">Resposta</span>
                        <p className="text-foreground/90 leading-snug whitespace-pre-wrap">{textoResposta}</p>
                        {longa && (
                          <button
                            type="button"
                            className="text-[10px] text-primary hover:underline"
                            onClick={() => setExpandido((s) => ({ ...s, [c.id]: !aberto }))}
                          >
                            {aberto ? "Ver menos" : "Ver mais"}
                          </button>
                        )}
                      </div>

                      {Array.isArray(c.fontes) && c.fontes.length > 0 && (
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold uppercase text-muted-foreground">Fontes</span>
                          <div className="flex flex-wrap gap-1">
                            {c.fontes.map((f: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[9px] py-0 h-4 bg-muted/50">
                                {f}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[9px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-2.5 w-2.5" />
                          {nomeUsuario(c.usuario_id)}
                          <span className="opacity-60">·</span>
                          {new Date(c.created_at).toLocaleString('pt-BR')}
                        </span>
                        {c.nivel_confianca && (
                          <span className={cn("font-bold px-1.5 py-0.5 rounded border", corConfianca(c.nivel_confianca))}>
                            {c.nivel_confianca}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {verResumoOpen && reuniaoSelecionada && (
        <ReuniaoDialog
          open={verResumoOpen}
          onOpenChange={setVerResumoOpen}
          clienteId={demanda.cliente_id}
          reuniao={reuniaoSelecionada}
        />
      )}
    </div>
  );
}

