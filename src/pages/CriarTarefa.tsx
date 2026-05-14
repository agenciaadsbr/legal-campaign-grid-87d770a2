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
import { Zap, Plus, FileText, Trash2, Info, LayoutGrid, History, X, ImageIcon, Smile, AtSign, Send, Paperclip, ChevronLeft, Link2, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { CATEGORIAS, CATEGORIA_LABEL, CATEGORIA_SUBTIPOS, PRIORIDADES, PRIORIDADE_LABEL, STATUS_DEMANDA, STATUS_DEMANDA_LABEL, STATUS_DEMANDA_COR, type DemandaCategoria } from "@/lib/demandas-categorias";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/RichTextEditor";
import { RichTextView } from "@/components/RichTextView";
import { TarefaIAConsulta } from "@/components/demandas/TarefaIAConsulta";
import { WorkflowSection } from "@/components/demandas/WorkflowSection";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIAS_COM_LINKS: DemandaCategoria[] = [
  "EditorVideo",
  "TrafegoPago",
  "LandingPage",
  "IAAtendimento",
  "Personalizado",
];

export default function CriarTarefa() {
  const navigate = useNavigate();
  const { clientes, responsaveis, createCardRascunho, updateCard, updatePost, addAtividade, statusPostOptions } = useCRM();
  const { createDemanda, addComentario, addAnexo, removeAnexo } = useDemandasStore();
  const { user, canWrite } = useAuth();
  
  const [loading, setLoading] = useState(false);

  // Form states
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
  const [linkMeister, setLinkMeister] = useState("");
  const [linkDrive, setLinkDrive] = useState("");
  const [descricao, setDescricao] = useState("");
  const [novoComentario, setNovoComentario] = useState("");
  
  // Post specific
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [dataPostagem, setDataPostagem] = useState("");
  const [legenda, setLegenda] = useState("");
  const [linkMeta, setLinkMeta] = useState("");

  const anexoFileRef = useRef<HTMLInputElement>(null);
  const [anexosLocais, setAnexosLocais] = useState<{id: string, file: File}[]>([]);

  const handleSubmit = async () => {
    if (!clienteId) {
        toast.error("Selecione um cliente para criar a tarefa.");
        return;
    }
    if (!categoria || !titulo.trim()) {
      toast.error("Preencha área e título");
      return;
    }

    setLoading(true);
    try {
      let refId = "";
      let type: 'post' | 'demanda' = 'demanda';

      if (categoria === "Posts") {
        type = 'post';
        const res = await createCardRascunho({ cliente_id: clienteId });
        if (res) {
          refId = res.postId;
          await updateCard(res.cardId, {
            titulo_card: titulo,
            is_urgent: isUrgent,
            data_inicio_tarefa: dataInicio ? new Date(dataInicio).toISOString() : null,
            data_limite_tarefa: dataLimite ? new Date(dataLimite).toISOString() : null,
            responsaveis: responsaveisIds
          });
          await updatePost(res.postId, {
            status: status as any,
            data_agendamento: dataAgendamento || undefined,
            data_postagem: dataPostagem || undefined,
            legenda: legenda || undefined,
            link_post: linkMeta || undefined,
            link_meister: linkMeister || undefined
          });

          // Upload anexos for post
          if (anexosLocais.length > 0) {
            const uploadedAnexos = [];
            for (const { file } of anexosLocais) {
                const path = `anexos/${Date.now()}-${file.name}`;
                const { error } = await supabase.storage.from("anexos").upload(path, file);
                if (!error) {
                    const { data: pub } = supabase.storage.from("anexos").getPublicUrl(path);
                    uploadedAnexos.push({ id: crypto.randomUUID(), nome: file.name, url: pub.publicUrl });
                }
            }
            if (uploadedAnexos.length > 0) {
                await updatePost(res.postId, { anexos: uploadedAnexos });
            }
          }
        }
      } else {
        type = 'demanda';
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
          link_meister: linkMeister || null,
          link_drive: linkDrive || null,
          descricao: descricao || null,
        });
        if (id) {
          refId = id;
          // Upload anexos for demanda
          for (const { file } of anexosLocais) {
            const path = `anexos/${Date.now()}-${file.name}`;
            const { error } = await supabase.storage.from("anexos").upload(path, file);
            if (!error) {
                const { data: pub } = supabase.storage.from("anexos").getPublicUrl(path);
                await addAnexo({
                    demanda_id: id,
                    nome: file.name,
                    url: pub.publicUrl,
                    mime: file.type,
                    size: file.size
                });
            }
          }
        }
      }

      if (refId) {
        toast.success("Tarefa criada com sucesso!");
        if (type === 'post') {
            navigate(`/clientes/${clienteId}/projeto?tab=posts&post=${refId}`);
        } else {
            navigate(`/clientes/${clienteId}/projeto?tab=projeto&demanda=${refId}`);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar tarefa");
    } finally {
      setLoading(false);
    }
  };

  const onAddLocalAnexo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newOnes = files.map(f => ({ id: crypto.randomUUID(), file: f }));
    setAnexosLocais(prev => [...prev, ...newOnes]);
    e.target.value = "";
  };

  const removeLocalAnexo = (id: string) => {
    setAnexosLocais(prev => prev.filter(a => a.id !== id));
  };

  const cliente = clientes.find(c => c.id === clienteId);

  return (
    <div className="p-3 gap-2 flex flex-col max-w-2xl mx-auto min-h-screen bg-background animate-fade-in">
      <div className="shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
        <Card className="shrink-0 overflow-hidden">
          <CardHeader className="pb-1.5 pt-2.5 px-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
                  Título da tarefa
                </div>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Criar landing page para campanha de inverno"
                  className="text-sm font-bold border-0 px-0 focus-visible:ring-0 h-auto"
                />
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                   <Select value={clienteId} onValueChange={setClienteId}>
                      <SelectTrigger className="h-6 w-auto border-0 p-0 text-primary font-medium focus:ring-0">
                        <SelectValue placeholder="Selecionar Cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>)}
                      </SelectContent>
                   </Select>
                   {categoria && <span>· {categoria === "Posts" ? "Posts" : CATEGORIA_LABEL[categoria as DemandaCategoria]}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={isUrgent ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsUrgent(!isUrgent)}
                  className={cn("gap-1.5", isUrgent && "bg-amber-500 hover:bg-amber-500/90 text-white border-amber-500")}
                >
                  <Zap className={cn("h-4 w-4", isUrgent && "fill-current")} />
                  Urgente
                </Button>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-40 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoria === "Posts" ? (
                        statusPostOptions.map(s => <SelectItem key={s.label} value={s.label}>{s.label}</SelectItem>)
                    ) : (
                        STATUS_DEMANDA.map((s) => (
                            <SelectItem key={s} value={s}>
                                <span className="flex items-center gap-2 text-xs">
                                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_DEMANDA_COR[s] }} />
                                {STATUS_DEMANDA_LABEL[s]}
                                </span>
                            </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-2 px-3 pb-2.5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px]">Categoria / Área</Label>
                <Select value={categoria} onValueChange={(v: any) => { setCategoria(v); setSubtipo(""); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Posts">Posts</SelectItem>
                    {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Subtipo</Label>
                {categoria === "Personalizado" ? (
                   <Input value={subtipo} onChange={e => setSubtipo(e.target.value)} className="h-8 text-xs" />
                ) : (
                  <Select value={subtipo || "__none__"} onValueChange={v => setSubtipo(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Não definido —</SelectItem>
                      {(CATEGORIA_SUBTIPOS[categoria as DemandaCategoria] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-[11px]">Prioridade</Label>
                <Select value={prioridade} onValueChange={setPrioridade}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map(p => <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
               <div>
                  <Label className="text-[11px]">Data início</Label>
                  <Input type="datetime-local" className="h-8 text-xs" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
               </div>
               <div>
                  <Label className="text-[11px]">Data limite</Label>
                  <Input type="datetime-local" className="h-8 text-xs" value={dataLimite} onChange={e => setDataLimite(e.target.value)} />
               </div>
            </div>

            <div className="md:col-span-2">
                <Label className="text-[11px]">Responsáveis</Label>
                <div className="mt-1">
                    <Popover>
                        <PopoverTrigger asChild>
                            <button type="button" className="group flex items-center gap-2 rounded-md border border-transparent hover:border-border hover:bg-accent px-2 py-1 -mx-2 transition-colors min-h-[36px] w-full">
                                {responsaveisIds.length > 0 ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {responsaveis.filter(r => responsaveisIds.includes(r.id)).map(r => (
                                            <div key={r.id} className="flex items-center gap-1.5">
                                                <div className="h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center" style={{ backgroundColor: r.cor }}>
                                                    {r.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                                                </div>
                                                <span className="text-xs">{r.nome}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground">+ atribuir responsáveis</span>
                                )}
                                <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                            <div className="max-h-60 overflow-auto space-y-0.5">
                                {responsaveis.map(r => {
                                    const active = responsaveisIds.includes(r.id);
                                    return (
                                        <button key={r.id} type="button" onClick={() => setResponsaveisIds(prev => active ? prev.filter(id => id !== r.id) : [...prev, r.id])} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm", active && "bg-accent")}>
                                             <div className="h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0" style={{ backgroundColor: r.cor }}>{r.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}</div>
                                             <span className="truncate">{r.nome}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {categoria === "Posts" && (
                <Card className="border-primary/20 bg-primary/5 mt-2">
                    <CardHeader className="pb-1.5 pt-2 px-3 flex flex-row items-center gap-2">
                         <LayoutGrid className="h-4 w-4 text-primary" />
                         <CardTitle className="text-xs font-semibold">Campos de Post</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2 px-3 pb-3">
                        <div>
                            <Label className="text-[11px]">Data de Agendamento</Label>
                            <Input type="date" value={dataAgendamento} onChange={e => setDataAgendamento(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div>
                            <Label className="text-[11px]">Data de Postagem</Label>
                            <Input type="date" value={dataPostagem} onChange={e => setDataPostagem(e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div className="md:col-span-2">
                            <Label className="text-[11px]">Link Meta Business Suite</Label>
                            <Input value={linkMeta} onChange={e => setLinkMeta(e.target.value)} placeholder="https://..." className="h-8 text-xs" />
                        </div>
                        <div className="md:col-span-2">
                            <Label className="text-[11px]">Legenda</Label>
                            <Textarea value={legenda} onChange={e => setLegenda(e.target.value)} className="text-xs min-h-[60px]" />
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="border-t pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-[11px]">Anexos</Label>
                  <input ref={anexoFileRef} type="file" multiple className="hidden" onChange={onAddLocalAnexo} />
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary" onClick={() => anexoFileRef.current?.click()}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {anexosLocais.map(a => (
                        <div key={a.id} className="group relative h-16 w-16 border rounded-lg overflow-hidden bg-muted/30">
                            <div className="flex flex-col items-center justify-center w-full h-full p-1 text-center">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <span className="text-[9px] mt-0.5 truncate w-full leading-tight">{a.file.name}</span>
                            </div>
                            <button onClick={() => removeLocalAnexo(a.id)} className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background border text-destructive opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-destructive hover:text-white">
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t pt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                    <Label className="text-[11px]">Link do Meister</Label>
                    <Input value={linkMeister} onChange={e => setLinkMeister(e.target.value)} placeholder="https://..." className="h-8 text-xs" />
                </div>
                <div>
                    <Label className="text-[11px]">Link do Drive</Label>
                    <Input value={linkDrive} onChange={e => setLinkDrive(e.target.value)} placeholder="https://..." className="h-8 text-xs" />
                </div>
            </div>

            <div className="border-t pt-2">
                <Label className="text-[11px]">Atividade / Briefing</Label>
                <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes da tarefa..." className="mt-1 h-32 text-xs" />
            </div>
          </CardContent>
        </Card>

        <Card className="shrink-0 overflow-hidden">
             <CardHeader className="pb-1 pt-2 px-3 shrink-0">
                <CardTitle className="text-xs uppercase tracking-wide">Atividade</CardTitle>
             </CardHeader>
             <CardContent className="px-3 pb-3">
                 <div className="text-sm text-muted-foreground text-center py-6">Sem comentários ainda</div>
                 <div className="border rounded-lg overflow-hidden">
                    <RichTextEditor value={novoComentario} onChange={setNovoComentario} placeholder="Escreva um comentário..." minHeight="48px" />
                    <div className="flex items-center justify-between px-2 py-1.5 border-t bg-muted/20">
                         <span className="text-[10px] text-muted-foreground">O comentário será salvo com a tarefa</span>
                         <Button size="sm" disabled={!novoComentario.trim()} className="gap-1.5"><Send className="h-3.5 w-3.5" /> Enviar</Button>
                    </div>
                 </div>
             </CardContent>
        </Card>

        {clienteId ? (
            <TarefaIAConsulta 
              demanda={{ id: 'new', cliente_id: clienteId, titulo: titulo || 'Nova Tarefa', categoria: categoria as any, status: status as any, prioridade: isUrgent ? 'Urgente' : prioridade } as any} 
              onAddComment={(txt) => setNovoComentario(prev => prev + `<br/>${txt}`)}
            />
        ) : (
            <div className="p-3 bg-muted/30 border border-dashed rounded-lg text-[11px] text-muted-foreground flex items-center gap-2">
                 <Sparkles className="h-3.5 w-3.5" /> Selecione um cliente para consultar informações da tarefa.
            </div>
        )}

        <div className="mt-4 flex gap-3">
            <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
                {loading ? "Salvando..." : "Salvar tarefa"}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)} disabled={loading}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}