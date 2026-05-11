import { useEffect, useState } from "react";
import { useReunioes, type Reuniao } from "@/store/reunioes";
import { useCRM } from "@/store/crm";
import { useTarefasSugeridas } from "@/store/tarefasSugeridas";
import { useIAConfig, useIAConfigBootstrap } from "@/store/iaConfig";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Sparkles, Plus, Wand2, Loader2 } from "lucide-react";

export function ReuniaoDialog({
  open,
  onOpenChange,
  clienteId,
  reuniao,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  clienteId: string;
  reuniao: Reuniao | null;
}) {
  const create = useReunioes((s) => s.create);
  const update = useReunioes((s) => s.update);
  const responsaveis = useCRM((s) => s.responsaveis);
  const createSugerida = useTarefasSugeridas((s) => s.create);

  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [tipo, setTipo] = useState("");
  const [linkTldv, setLinkTldv] = useState("");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [transcricao, setTranscricao] = useState("");
  const [resumoCliente, setResumoCliente] = useState("");
  const [resumoTarefas, setResumoTarefas] = useState("");

  useEffect(() => {
    if (open) {
      setTitulo(reuniao?.titulo ?? "");
      setData(reuniao?.data ? new Date(reuniao.data).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
      setTipo(reuniao?.tipo ?? "");
      setLinkTldv(reuniao?.link_tldv ?? "");
      setResponsavelId(reuniao?.responsavel_id ?? "");
      setObservacoes(reuniao?.observacoes ?? "");
      setTranscricao(reuniao?.transcricao ?? "");
      setResumoCliente(reuniao?.resumo_cliente ?? "");
      setResumoTarefas(reuniao?.resumo_tarefas ?? "");
    }
  }, [open, reuniao]);

  const handleSave = async () => {
    if (!titulo.trim()) {
      toast.error("Informe o título");
      return;
    }
    const payload = {
      cliente_id: clienteId,
      titulo,
      data: new Date(data).toISOString(),
      tipo: tipo || null,
      link_tldv: linkTldv || null,
      responsavel_id: responsavelId || null,
      observacoes: observacoes || null,
      transcricao: transcricao || null,
      resumo_cliente: resumoCliente || null,
      resumo_tarefas: resumoTarefas || null,
    };
    if (reuniao) {
      await update(reuniao.id, payload as any);
      toast.success("Reunião atualizada");
    } else {
      await create(payload as any);
    }
    onOpenChange(false);
  };

  const copiar = async (txt: string, label: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const gerarSugestaoRapida = async () => {
    if (!resumoTarefas.trim()) {
      toast.error("Preencha o resumo de tarefas primeiro");
      return;
    }
    const linhas = resumoTarefas.split(/\n+/).map((l) => l.replace(/^[-*\d.\s]+/, "").trim()).filter((l) => l.length > 3);
    if (linhas.length === 0) {
      toast.error("Não encontrei itens no resumo de tarefas");
      return;
    }
    let count = 0;
    for (const linha of linhas.slice(0, 10)) {
      const r = await createSugerida({
        cliente_id: clienteId,
        reuniao_id: reuniao?.id ?? null,
        titulo: linha.slice(0, 200),
        descricao: linha,
        origem: "reuniao",
      } as any);
      if (r) count++;
    }
    toast.success(`${count} tarefa(s) sugerida(s) criada(s)`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reuniao ? "Editar reunião" : "Nova reunião"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs">Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Reunião semanal, alinhamento, kickoff..." />
          </div>
          <div>
            <Label className="text-xs">Data e hora</Label>
            <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Tipo / contexto</Label>
            <Input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Semanal, Estratégia, Onboarding..." />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Link TLDV</Label>
            <Input value={linkTldv} onChange={(e) => setLinkTldv(e.target.value)} placeholder="https://tldv.io/..." />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Responsável</Label>
            <Select value={responsavelId || "__none__"} onValueChange={(v) => setResponsavelId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {responsaveis.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="resumos" className="mt-2">
          <TabsList className="h-8">
            <TabsTrigger value="resumos" className="text-xs h-7">Resumos</TabsTrigger>
            <TabsTrigger value="transcricao" className="text-xs h-7">Transcrição</TabsTrigger>
            <TabsTrigger value="observacoes" className="text-xs h-7">Observações</TabsTrigger>
          </TabsList>

          <TabsContent value="resumos" className="space-y-3 mt-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Resumo cliente <span className="text-muted-foreground">(curto, estilo ata, pronto pro grupo)</span></Label>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copiar(resumoCliente, "Resumo cliente")}>
                  <Copy className="h-3 w-3 mr-1" /> Copiar
                </Button>
              </div>
              <Textarea rows={5} value={resumoCliente} onChange={(e) => setResumoCliente(e.target.value)} placeholder="O que foi alinhado, próximos passos pelo cliente..." />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Resumo tarefas <span className="text-muted-foreground">(detalhado, operacional, pronto para virar tarefas)</span></Label>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copiar(resumoTarefas, "Resumo tarefas")}>
                    <Copy className="h-3 w-3 mr-1" /> Copiar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={gerarSugestaoRapida} disabled={!reuniao}>
                    <Plus className="h-3 w-3 mr-1" /> Gerar tarefas sugeridas
                  </Button>
                </div>
              </div>
              <Textarea rows={7} value={resumoTarefas} onChange={(e) => setResumoTarefas(e.target.value)} placeholder="- Atualizar landing page&#10;- Criar 4 vídeos para Instagram..." />
              {!reuniao && (
                <p className="text-[10px] text-muted-foreground mt-1">Salve a reunião primeiro para poder gerar tarefas sugeridas.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transcricao" className="mt-3">
            <Textarea rows={14} value={transcricao} onChange={(e) => setTranscricao(e.target.value)} placeholder="Cole aqui a transcrição completa da reunião..." />
          </TabsContent>

          <TabsContent value="observacoes" className="mt-3">
            <Textarea rows={8} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações internas, contexto, riscos..." />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}><Sparkles className="h-4 w-4 mr-1" /> Salvar reunião</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
