import { useState, useEffect } from "react";
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
  ExternalLink,
  Bot
} from "lucide-react";
import { useIAConsultas } from "@/store/iaConsultas";
import { useReunioes } from "@/store/reunioes";
import { useCRM } from "@/store/crm";
import { useAuth } from "@/hooks/useAuth";
import { Demanda } from "@/store/demandas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Props {
  demanda: Demanda;
  onAddComment?: (text: string) => void;
}

export function TarefaIAConsulta({ demanda, onAddComment }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState<any>(null);
  
  const { 
    consultarIA, 
    loading, 
    tarefaConsultas, 
    loadConsultasByDemanda,
    setorPrompts,
    loadSetorPrompts
  } = useIAConsultas();
  
  const { reunioes, load: loadReunioes } = useReunioes();
  const { clientes } = useCRM();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadConsultasByDemanda(demanda.id);
      loadSetorPrompts();
      loadReunioes();
    }
  }, [isOpen, demanda.id]);

  const handleConsultar = async () => {
    if (!pergunta.trim() || loading) return;

    const cliente = clientes.find(c => c.id === demanda.cliente_id);
    const reunioesCliente = reunioes.filter(r => r.cliente_id === demanda.cliente_id);
    const promptSetor = setorPrompts.find(p => p.setor === demanda.categoria)?.prompt;

    const res = await consultarIA({
      demanda_id: demanda.id,
      pergunta,
      cliente_nome: cliente?.nome_cliente || "Desconhecido",
      tarefa_titulo: demanda.titulo,
      tarefa_categoria: demanda.categoria,
      tarefa_subtipo: demanda.subtipo,
      tarefa_prioridade: demanda.prioridade,
      tarefa_descricao: demanda.descricao,
      tarefa_comentarios: "", // Opcional: injetar comentários se necessário
      reunioes: reunioesCliente.map(r => ({
        titulo: r.titulo,
        data: r.data,
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
                  placeholder="Digite aqui sua dúvida... (Ex: Qual foi o pedido exato do cliente?)"
                  value={pergunta}
                  onChange={(e) => setPergunta(e.target.value)}
                  className="text-xs min-h-[60px] resize-none bg-background"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleConsultar();
                    }
                  }}
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  size="sm" 
                  onClick={handleConsultar} 
                  disabled={loading || !pergunta.trim()}
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
                  
                  <p className="text-xs leading-relaxed">{resposta.resposta}</p>
                  
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
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Nível de confiança:</span>
                      <span className={cn(
                        "text-[10px] font-bold",
                        resposta.nivel_confianca === "Alto" ? "text-emerald-500" :
                        resposta.nivel_confianca === "Médio" ? "text-amber-500" : "text-destructive"
                      )}>
                        {resposta.nivel_confianca}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico Local */}
          {tarefaConsultas.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase text-muted-foreground px-1">Histórico de consultas</span>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {tarefaConsultas.map((c) => (
                  <div key={c.id} className="p-2 rounded border bg-muted/20 text-[11px] space-y-1">
                    <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                      <span className="font-medium italic">"{c.pergunta}"</span>
                      <span>{new Date(c.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-muted-foreground leading-tight line-clamp-2">{c.resposta}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
