import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCRM } from "@/store/crm";
import { useDemandasStore } from "@/store/demandas";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Zap, Plus, FileText, Trash2, Info, LayoutGrid, History, X, ImageIcon, Smile, AtSign, Send, Paperclip } from "lucide-react";
import { CATEGORIAS, CATEGORIA_LABEL, CATEGORIA_SUBTIPOS, PRIORIDADES, PRIORIDADE_LABEL, STATUS_DEMANDA, STATUS_DEMANDA_LABEL, type DemandaCategoria } from "@/lib/demandas-categorias";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/RichTextEditor";
import { RichTextView } from "@/components/RichTextView";

export default function CriarTarefa() {
  const navigate = useNavigate();
  const { clientes, responsaveis, createCardRascunho, updateCard, updatePost, addAtividade } = useCRM();
  const { createDemanda, addComentario } = useDemandasStore();
  const { user } = useAuth();
  
  const [clienteId, setClienteId] = useState("");
  const [categoria, setCategoria] = useState<DemandaCategoria | "Posts">("" as any);
  const [subtipo, setSubtipo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [status, setStatus] = useState("Planejamento");
  const [prioridade, setPrioridade] = useState<any>("Media");
  const [dataInicio, setDataInicio] = useState("");
  const [dataLimite, setDataLimite] = useState("");
  const [responsaveisIds, setResponsaveisIds] = useState<string[]>([]);
  const [descricao, setDescricao] = useState("");
  const [novoComentario, setNovoComentario] = useState("");

  const handleSubmit = async () => {
    if (!clienteId) {
        toast.error("Selecione um cliente para criar a tarefa.");
        return;
    }
    if (!categoria || !titulo.trim()) {
      toast.error("Preencha área e título");
      return;
    }

    try {
      if (categoria === "Posts") {
        const res = await createCardRascunho({ cliente_id: clienteId });
        if (res) {
          await updateCard(res.cardId, {
            titulo_card: titulo,
            is_urgent: isUrgent,
            data_inicio_tarefa: dataInicio || null,
            data_limite_tarefa: dataLimite || null,
            responsaveis: responsaveisIds
          });
          await updatePost(res.postId, {
            status: status as any,
          });
          toast.success("Tarefa criada!");
          navigate(`/clientes/${clienteId}/projeto?tab=posts&post=${res.postId}`);
        }
      } else {
        const id = await createDemanda({
          cliente_id: clienteId,
          titulo,
          categoria: categoria as DemandaCategoria,
          subtipo: subtipo || null,
          prioridade: isUrgent ? "Urgente" : prioridade,
          status: status as any,
          data_inicio: dataInicio ? new Date(dataInicio).toISOString() : null,
          data_limite: dataLimite ? new Date(dataLimite).toISOString() : null,
          responsaveis_ids: responsaveisIds,
          descricao: descricao || null,
        });
        if (id) {
            toast.success("Tarefa criada!");
            navigate(`/clientes/${clienteId}/projeto?tab=projeto&demanda=${id}`);
        }
      }
    } catch (err) {
      toast.error("Erro ao salvar");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
        <header>
            <h1 className="text-2xl font-bold">Criar Nova Tarefa</h1>
        </header>

        {!clienteId && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-md text-xs flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-600" />
            <span className="text-amber-700">Selecione um cliente para criar a tarefa.</span>
        </div>
        )}

        <Card>
            <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Cliente *</Label>
                        <Select value={clienteId} onValueChange={setClienteId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o cliente" />
                            </SelectTrigger>
                            <SelectContent>
                                {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Área *</Label>
                        <Select value={categoria} onValueChange={(v: any) => setCategoria(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a área" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Posts">Posts</SelectItem>
                                {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Título da Tarefa *</Label>
                    <Input value={titulo} onChange={e => setTitulo(e.target.value)} />
                </div>

                <div className="flex items-center gap-2">
                    <Checkbox id="urgent" checked={isUrgent} onCheckedChange={(v: boolean) => setIsUrgent(v)} />
                    <Label htmlFor="urgent">Urgente</Label>
                </div>
                
                <div className="flex gap-4 pt-4 border-t">
                    <Button onClick={handleSubmit}>Salvar tarefa</Button>
                    <Button variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}