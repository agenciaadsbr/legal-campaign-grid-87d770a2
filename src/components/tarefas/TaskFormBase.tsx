import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDemandasStore, getResponsaveisIds } from "@/store/demandas";
import { useCRM } from "@/store/crm";
import { useAuth } from "@/hooks/useAuth";
import {
  CATEGORIA_LABEL,
  CATEGORIAS,
  CATEGORIA_SUBTIPOS,
  PRIORIDADES,
  PRIORIDADE_LABEL,
  STATUS_DEMANDA,
  STATUS_DEMANDA_LABEL,
  type DemandaCategoria,
  type DemandaPrioridade,
  type DemandaStatus,
} from "@/lib/demandas-categorias";
import {
  Plus,
  X,
  Paperclip,
  Link2,
  Trash2,
  ExternalLink,
  Zap,
} from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WorkflowSection } from "@/components/demandas/WorkflowSection";
import { isAguardandoDependencia } from "@/lib/workflow";

interface TaskFormBaseProps {
  initialDemandaId?: string;
  initialPostId?: string;
  onSuccess?: (tipo: 'demanda' | 'post', clienteId: string, refId: string) => void;
  onCancel?: () => void;
  standalone?: boolean;
}

export function TaskFormBase({ 
  initialDemandaId, 
  initialPostId,
  onSuccess, 
  onCancel,
  standalone = true 
}: TaskFormBaseProps) {
  const { clientes, responsaveis, updateCard, moveCard, updatePost, statusPostOptions, addAtividade, createCardRascunho } = useCRM();
  const { user, canWrite } = useAuth();
  const { 
    demandas, 
    anexos, 
    comentarios, 
    dependencies,
    updateDemanda, 
    addAnexo, 
    removeAnexo,
    createDemanda,
    addComentario
  } = useDemandasStore();

  const [loading, setLoading] = useState(false);

  // Form states
  const [clienteId, setClienteId] = useState("");
  const [categoria, setCategoria] = useState<DemandaCategoria | "Posts">("Designer" as any);
  const [subtipo, setSubtipo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [status, setStatus] = useState<string>("Planejamento");
  const [prioridade, setPrioridade] = useState<DemandaPrioridade>("Media");
  const [dataInicio, setDataInicio] = useState("");
  const [dataLimite, setDataLimite] = useState("");
  const [responsaveisIds, setResponsaveisIds] = useState<string[]>([]);
  const [linkMeister, setLinkMeister] = useState("");
  const [linkDrive, setLinkDrive] = useState("");
  const [descricao, setDescricao] = useState("");
  const [novoComentario, setNovoComentario] = useState("");

  // Post specific states
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [dataPostagem, setDataPostagem] = useState("");
  const [legenda, setLegenda] = useState("");
  const [linkMeta, setLinkMeta] = useState("");

  const anexoFileRef = useRef<HTMLInputElement>(null);

  // Load initial data if editing
  useEffect(() => {
    if (initialDemandaId) {
      const d = demandas.find(x => x.id === initialDemandaId);
      if (d) {
        setClienteId(d.cliente_id);
        setCategoria(d.categoria);
        setSubtipo(d.subtipo || "");
        setTitulo(d.titulo);
        setIsUrgent(d.prioridade === "Urgente");
        setStatus(d.status);
        setPrioridade(d.prioridade);
        setDataInicio(d.data_inicio ? d.data_inicio.split('T')[0] : "");
        setDataLimite(d.data_limite ? d.data_limite.split('T')[0] : "");
        setResponsaveisIds(getResponsaveisIds(d));
        setLinkMeister(d.link_meister || "");
        setLinkDrive(d.link_drive || "");
        setDescricao(d.descricao || "");
      }
    } else if (initialPostId) {
      const p = useCRM.getState().posts.find(x => x.id === initialPostId);
      const c = p && useCRM.getState().cards.find(x => x.id === p.card_id);
      if (p && c) {
        setClienteId(c.cliente_id);
        setCategoria("Posts");
        setTitulo(c.titulo_card);
        setIsUrgent(c.is_urgent);
        setStatus(p.status);
        setDataInicio(c.data_inicio_tarefa || "");
        setDataLimite(c.data_limite_tarefa || "");
        setResponsaveisIds(c.responsaveis || []);
        setLinkMeister(p.link_meister || "");
        setDataAgendamento(p.data_agendamento || "");
        setDataPostagem(p.data_postagem || "");
        setLegenda(p.legenda || "");
        setLinkMeta(p.link_post || "");
      }
    }
  }, [initialDemandaId, initialPostId, demandas]);

  const handleSubmit = async () => {
    if (!clienteId || !categoria || !titulo.trim()) {
      toast.error("Preencha cliente, área e título");
      return;
    }

    setLoading(true);
    try {
      if (categoria === "Posts") {
        // Lógica de Post
        if (initialPostId) {
          const p = useCRM.getState().posts.find(x => x.id === initialPostId);
          if (p) {
            await updateCard(p.card_id, {
              titulo_card: titulo,
              is_urgent: isUrgent,
              data_inicio_tarefa: dataInicio || null,
              data_limite_tarefa: dataLimite || null,
              responsaveis: responsaveisIds
            });
            await updatePost(initialPostId, {
              status: status as any,
              data_agendamento: dataAgendamento || undefined,
              data_postagem: dataPostagem || undefined,
              legenda,
              link_post: linkMeta || undefined,
              link_meister: linkMeister || undefined
            });
            onSuccess?.('post', clienteId, initialPostId);
          }
        } else {
          // Criar novo Post
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
              data_agendamento: dataAgendamento || undefined,
              data_postagem: dataPostagem || undefined,
              legenda,
              link_post: linkMeta || undefined,
              link_meister: linkMeister || undefined
            });
            onSuccess?.('post', clienteId, res.postId);
          }
        }
      } else {
        // Lógica de Demanda (Vídeos, Tráfego, LP, IA, Operacional, Urgências)
        const payload = {
          cliente_id: clienteId,
          titulo,
          categoria: categoria as DemandaCategoria,
          subtipo: subtipo || null,
          prioridade: isUrgent ? "Urgente" as const : prioridade,
          status: status as DemandaStatus,
          data_inicio: dataInicio ? new Date(dataInicio).toISOString() : null,
          data_limite: dataLimite ? new Date(dataLimite).toISOString() : null,
          responsaveis_ids: responsaveisIds,
          link_meister: linkMeister || null,
          link_drive: linkDrive || null,
          descricao: descricao || null,
        };

        if (initialDemandaId) {
          await updateDemanda(initialDemandaId, payload);
          onSuccess?.('demanda', clienteId, initialDemandaId);
        } else {
          const id = await createDemanda(payload);
          if (id) onSuccess?.('demanda', clienteId, id);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar tarefa");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnexo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || (!initialDemandaId && !initialPostId)) return;

    const toastId = toast.loading("Enviando...");
    try {
      for (const f of files) {
        const path = `anexos/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("anexos").upload(path, f);
        if (error) throw error;
        const { data: pub } = supabase.storage.from("anexos").getPublicUrl(path);
        
        if (initialDemandaId) {
          await addAnexo({
            demanda_id: initialDemandaId,
            nome: f.name,
            url: pub.publicUrl,
            mime: f.type,
            size: f.size
          });
        } else if (initialPostId) {
          const p = useCRM.getState().posts.find(x => x.id === initialPostId);
          if (p) {
            const novosAnexos = [...(p.anexos || []), { id: crypto.randomUUID(), nome: f.name, url: pub.publicUrl }];
            await updatePost(initialPostId, { anexos: novosAnexos });
          }
        }
      }
      toast.success("Anexos adicionados", { id: toastId });
    } catch (err) {
      toast.error("Erro ao anexar", { id: toastId });
    }
  };

  const currentDemanda = initialDemandaId ? demandas.find(d => d.id === initialDemandaId) : null;
  const isAguardando = initialDemandaId ? isAguardandoDependencia(initialDemandaId, dependencies) : false;

  return (
    <div className="space-y-6">
      {isAguardando && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-md text-xs flex items-start gap-2">
          <span className="mt-0.5">🔒</span>
          <div>
            <div className="font-semibold text-amber-600">Aguardando etapa anterior</div>
            <div className="text-muted-foreground">Esta tarefa está bloqueada até que a anterior seja concluída.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cliente e Área */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={clienteId} onValueChange={setClienteId} disabled={!!initialDemandaId || !!initialPostId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Área *</Label>
            <Select 
              value={categoria} 
              onValueChange={(v: any) => setCategoria(v)} 
              disabled={!!initialDemandaId || !!initialPostId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Posts">Posts</SelectItem>
                {CATEGORIAS.map(c => (
                  <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {categoria !== "Posts" && (
            <div className="space-y-2">
              <Label>Subtipo</Label>
              <Select value={subtipo} onValueChange={setSubtipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o subtipo" />
                </SelectTrigger>
                <SelectContent>
                  {(CATEGORIA_SUBTIPOS[categoria as DemandaCategoria] || []).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Título e Urgente */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título da Tarefa *</Label>
            <Input 
              value={titulo} 
              onChange={e => setTitulo(e.target.value)} 
              placeholder="Ex: Criar arte para Reels"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox id="urgent" checked={isUrgent} onCheckedChange={(v: boolean) => setIsUrgent(v)} />
            <Label htmlFor="urgent" className="flex items-center gap-2 cursor-pointer">
              <Zap className={cn("h-4 w-4", isUrgent && "fill-amber-500 text-amber-500")} />
              Urgente
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoria === "Posts" ? (
                    statusPostOptions.map(s => <SelectItem key={s.label} value={s.label}>{s.label}</SelectItem>)
                  ) : (
                    STATUS_DEMANDA.map(s => <SelectItem key={s} value={s}>{STATUS_DEMANDA_LABEL[s]}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v: any) => setPrioridade(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map(p => (
                    <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Datas e Responsáveis */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Limite</Label>
              <Input type="date" value={dataLimite} onChange={e => setDataLimite(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Responsáveis</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal">
                  {responsaveisIds.length > 0 
                    ? `${responsaveisIds.length} selecionado(s)` 
                    : "Atribuir responsáveis"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="max-h-60 overflow-auto space-y-1">
                  {responsaveis.map(r => (
                    <div key={r.id} className="flex items-center gap-2 p-1 hover:bg-accent rounded-md cursor-pointer" 
                         onClick={() => {
                           setResponsaveisIds(prev => 
                             prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id]
                           );
                         }}>
                      <Checkbox checked={responsaveisIds.includes(r.id)} />
                      <span className="text-sm">{r.nome}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Links e Anexos */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Link do Meister</Label>
            <Input value={linkMeister} onChange={e => setLinkMeister(e.target.value)} placeholder="https://..." />
          </div>
          {categoria !== "Posts" && (
            <div className="space-y-2">
              <Label>Link do Drive</Label>
              <Input value={linkDrive} onChange={e => setLinkDrive(e.target.value)} placeholder="https://..." />
            </div>
          )}
          
          {(initialDemandaId || initialPostId) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Anexos</Label>
                <Button variant="ghost" size="sm" onClick={() => anexoFileRef.current?.click()} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
                <input ref={anexoFileRef} type="file" multiple className="hidden" onChange={handleAddAnexo} />
              </div>
              <div className="space-y-1">
                {/* Renderizar anexos aqui */}
              </div>
            </div>
          )}
        </div>
      </div>

      {categoria === "Posts" && (
        <Card className="bg-muted/30">
          <CardContent className="p-4 space-y-4">
            <div className="font-semibold text-sm border-b pb-1">Campos de Post</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Agendamento</Label>
                <Input type="date" value={dataAgendamento} onChange={e => setDataAgendamento(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data Postagem</Label>
                <Input type="date" value={dataPostagem} onChange={e => setDataPostagem(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Link Meta Business Suite</Label>
                <Input value={linkMeta} onChange={e => setLinkMeta(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Legenda</Label>
                <Textarea value={legenda} onChange={e => setLegenda(e.target.value)} rows={4} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label>Atividade / Briefing</Label>
        <RichTextEditor value={descricao} onChange={setDescricao} placeholder="Descreva os detalhes da tarefa..." />
      </div>

      {(initialDemandaId || initialPostId) && (
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-sm font-bold uppercase tracking-wide">Comentários</Label>
          {/* Renderizar comentários aqui */}
          <div className="flex gap-2">
            <Input value={novoComentario} onChange={e => setNovoComentario(e.target.value)} placeholder="Escreva um comentário..." />
            <Button size="icon" onClick={async () => {
              if (!novoComentario.trim() || !user) return;
              if (initialDemandaId) await addComentario(initialDemandaId, user.id, novoComentario);
              setNovoComentario("");
            }}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {currentDemanda && (
        <div className="pt-4 border-t">
          <WorkflowSection pai={currentDemanda} />
        </div>
      )}

      {standalone && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Salvando..." : "Salvar Tarefa"}</Button>
        </div>
      )}
    </div>
  );
}
