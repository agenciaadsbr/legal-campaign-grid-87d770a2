import { useEffect, useState } from "react";
import { useReunioes, type Reuniao } from "@/store/reunioes";
import { useCRM } from "@/store/crm";
import { useTarefasSugeridas } from "@/store/tarefasSugeridas";
import { useIAConfig, useIAConfigBootstrap } from "@/store/iaConfig";
import { useDelegations, useDelegationsBootstrap } from "@/store/delegations";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Sparkles, Plus, Wand2, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Users } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const reloadSugeridas = useTarefasSugeridas((s) => s.load);
  const createSugerida = useTarefasSugeridas((s) => s.create);
  useIAConfigBootstrap();
  const iaAtivo = useIAConfig((s) => s.configs.some((c) => c.ativo));
  useDelegationsBootstrap();
  const delegationConfig = useDelegations((s) => s.config);
  const createDelegation = useDelegations((s) => s.createDelegation);
  const [iaBusy, setIaBusy] = useState<null | "cliente" | "operacional" | "tarefas" | "processar">(null);
  const [reprocDialog, setReprocDialog] = useState(false);
  const [iaStatus, setIaStatus] = useState<any>(null);
  const [iaProcessedAt, setIaProcessedAt] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [tipo, setTipo] = useState("");
  const [linkTldv, setLinkTldv] = useState("");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [transcricao, setTranscricao] = useState("");
  const [resumoCliente, setResumoCliente] = useState("");
  const [resumoTarefas, setResumoTarefas] = useState("");
  const [gerarDelegacao, setGerarDelegacao] = useState(false);
  const [responsavelDelegacaoId, setResponsavelDelegacaoId] = useState("");
  const [prazoDelegacao, setPrazoDelegacao] = useState("");
  const [obsDelegacao, setObsDelegacao] = useState("");

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
      setIaStatus((reuniao as any)?.ia_status ?? null);
      setIaProcessedAt((reuniao as any)?.ia_processed_at ?? null);
      setGerarDelegacao(reuniao?.gerar_alerta_delegacao ?? false);
      setResponsavelDelegacaoId(reuniao?.responsavel_delegacao_id ?? "");
      setPrazoDelegacao(reuniao?.prazo_delegacao ?? "");
      setObsDelegacao(reuniao?.observacoes_delegacao ?? "");
    }
  }, [open, reuniao]);

  // Auto-suggest delegation for specific types
  useEffect(() => {
    if (open && !reuniao && tipo && delegationConfig?.tipos_sugestao_automatica?.includes(tipo)) {
      setGerarDelegacao(true);
      if (delegationConfig.responsavel_padrao_id && !responsavelDelegacaoId) {
        setResponsavelDelegacaoId(delegationConfig.responsavel_padrao_id);
      }
      if (delegationConfig.prazo_padrao_dias && !prazoDelegacao) {
        const date = new Date();
        // Simple logic for business days (skipping weekends)
        let added = 0;
        while (added < delegationConfig.prazo_padrao_dias) {
          date.setDate(date.getDate() + 1);
          if (date.getDay() !== 0 && date.getDay() !== 6) added++;
        }
        setPrazoDelegacao(date.toISOString().split("T")[0]);
      }
    }
  }, [tipo, delegationConfig]);

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
      gerar_alerta_delegacao: gerarDelegacao,
      responsavel_delegacao_id: responsavelDelegacaoId || null,
      prazo_delegacao: prazoDelegacao || null,
      observacoes_delegacao: obsDelegacao || null,
    };
    if (reuniao) {
      await update(reuniao.id, payload as any);
      toast.success("Reunião atualizada");
    } else {
      const newReuniao = await create(payload as any);
      if (newReuniao && gerarDelegacao && responsavelDelegacaoId) {
        await createDelegation({
          reuniao_id: newReuniao.id,
          cliente_id: clienteId,
          responsavel_id: responsavelDelegacaoId,
          prazo: prazoDelegacao || null,
          observacoes: obsDelegacao || null,
          status: "Aguardando delegação",
        });
        
        // Registrar atividade
        const respDeleg = responsaveis.find(r => r.id === responsavelDelegacaoId);
        const { data: userData } = await supabase.auth.getUser();
        const userName = userData.user?.email?.split('@')[0] || "Sistema";
        
        await (supabase as any).from("atividade_cliente").insert({
          cliente_id: clienteId,
          tipo: "Observação",
          conteudo: `${userName} criou alerta de delegação para ${respDeleg?.nome || "Responsável"} referente à reunião "${titulo}".`,
        });
      }
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

  const gerarResumoIA = async (tipo: "resumo_cliente" | "resumo_operacional") => {
    if (!transcricao.trim()) {
      toast.error("Cole a transcrição da reunião primeiro");
      return;
    }
    setIaBusy(tipo === "resumo_cliente" ? "cliente" : "operacional");
    try {
      const { data, error } = await supabase.functions.invoke("ia-gerar-resumo", {
        body: { tipo, transcricao, contexto: titulo },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (tipo === "resumo_cliente") setResumoCliente(data.texto ?? "");
      else setResumoTarefas(data.texto ?? "");
      toast.success(`Resumo gerado · ${data.modelo}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar resumo");
    } finally {
      setIaBusy(null);
    }
  };

  const gerarTarefasIA = async () => {
    const base = transcricao.trim() || resumoTarefas.trim();
    if (!base) {
      toast.error("Cole a transcrição ou o resumo de tarefas primeiro");
      return;
    }
    setIaBusy("tarefas");
    try {
      const { data, error } = await supabase.functions.invoke("ia-gerar-tarefas", {
        body: { cliente_id: clienteId, reuniao_id: reuniao?.id ?? null, transcricao: base },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.count} tarefa(s) sugerida(s) criada(s) por IA`);
      await reloadSugeridas();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar tarefas");
    } finally {
      setIaBusy(null);
    }
  };

  const processarReuniao = async (modo: "novo" | "substituir" | "manter", sobrescreverResumos: boolean) => {
    if (!reuniao) { toast.error("Salve a reunião antes de processar"); return; }
    if (!transcricao.trim()) { toast.error("Cole a transcrição primeiro"); return; }
    setIaBusy("processar");
    try {
      const { data, error } = await supabase.functions.invoke("ia-processar-reuniao", {
        body: { reuniao_id: reuniao.id, modo, sobrescrever_resumos: sobrescreverResumos },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.resumo_cliente && (sobrescreverResumos || !resumoCliente)) setResumoCliente(data.resumo_cliente);
      if (data?.resumo_operacional && (sobrescreverResumos || !resumoTarefas)) setResumoTarefas(data.resumo_operacional);
      setIaStatus(data.status);
      setIaProcessedAt(new Date().toISOString());
      await reloadSugeridas();
      toast.success(`Processado · ${data.tarefas_inseridas} tarefa(s) sugerida(s)${data.tarefas_substituidas ? `, ${data.tarefas_substituidas} substituída(s)` : ""}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao processar reunião");
    } finally {
      setIaBusy(null);
    }
  };

  const handleProcessarClick = () => {
    if (!reuniao) { toast.error("Salve a reunião antes de processar"); return; }
    if (iaProcessedAt || resumoCliente || resumoTarefas) {
      setReprocDialog(true);
    } else {
      processarReuniao("novo", false);
    }
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

        {/* Processamento IA — orquestrador dos 2 agentes */}
        <div className="mt-3 border border-border rounded-md bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-medium flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Processamento IA</span>
              <StatusPill ok={iaStatus?.cliente?.ok} label="Resumo cliente" />
              <StatusPill ok={iaStatus?.operacional?.ok} label="Resumo operacional" />
              <StatusPill ok={iaStatus?.tarefas?.ok} label="Tarefas" />
              {iaProcessedAt && (
                <span className="text-muted-foreground text-[11px]">· última: {new Date(iaProcessedAt).toLocaleString("pt-BR")}</span>
              )}
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs" onClick={handleProcessarClick} disabled={iaBusy !== null || !reuniao}>
                {iaBusy === "processar"
                  ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  : iaProcessedAt ? <RefreshCw className="h-3.5 w-3.5 mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                {iaProcessedAt ? "Reprocessar IA" : "Processar reunião com IA"}
              </Button>
            </div>
          </div>
          {!reuniao && <p className="text-[11px] text-muted-foreground mt-2">Salve a reunião primeiro para processar com IA.</p>}
        </div>

        <Tabs defaultValue="resumos" className="mt-2">
          <TabsList className="h-8">
            <TabsTrigger value="resumos" className="text-xs h-7">Resumos</TabsTrigger>
            <TabsTrigger value="transcricao" className="text-xs h-7">Transcrição</TabsTrigger>
            <TabsTrigger value="observacoes" className="text-xs h-7">Observações</TabsTrigger>
            <TabsTrigger value="delegacao" className="text-xs h-7">Delegação interna</TabsTrigger>
          </TabsList>

          <TabsContent value="resumos" className="space-y-3 mt-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Resumo cliente <span className="text-muted-foreground">(curto, estilo ata, pronto pro grupo)</span></Label>
                <div className="flex gap-1">
                  {iaAtivo && (
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => gerarResumoIA("resumo_cliente")} disabled={iaBusy !== null}>
                      {iaBusy === "cliente" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                      Gerar com IA
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copiar(resumoCliente, "Resumo cliente")}>
                    <Copy className="h-3 w-3 mr-1" /> Copiar
                  </Button>
                </div>
              </div>
              <Textarea rows={5} value={resumoCliente} onChange={(e) => setResumoCliente(e.target.value)} placeholder="O que foi alinhado, próximos passos pelo cliente..." />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Resumo tarefas <span className="text-muted-foreground">(detalhado, operacional, pronto para virar tarefas)</span></Label>
                <div className="flex gap-1">
                  {iaAtivo && (
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => gerarResumoIA("resumo_operacional")} disabled={iaBusy !== null}>
                      {iaBusy === "operacional" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                      Gerar com IA
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copiar(resumoTarefas, "Resumo tarefas")}>
                    <Copy className="h-3 w-3 mr-1" /> Copiar
                  </Button>
                  {iaAtivo && (
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={gerarTarefasIA} disabled={iaBusy !== null}>
                      {iaBusy === "tarefas" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                      Tarefas com IA
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={gerarSugestaoRapida} disabled={!reuniao}>
                    <Plus className="h-3 w-3 mr-1" /> Gerar manual
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
            <Textarea rows={8} value={observacoes} onChange={(e) => setObsDelegacao(e.target.value)} placeholder="Observações internas, contexto, riscos..." />
          </TabsContent>

          <TabsContent value="delegacao" className="mt-3 space-y-3">
            <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded border">
              <Checkbox 
                id="gerar-alerta" 
                checked={gerarDelegacao} 
                onCheckedChange={(v) => setGerarDelegacao(v as boolean)} 
              />
              <Label htmlFor="gerar-alerta" className="font-semibold cursor-pointer">Gerar alerta para delegação de tarefas</Label>
            </div>

            {gerarDelegacao && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border rounded-md">
                <div className="md:col-span-2">
                  <Label className="text-xs">Responsável pela delegação</Label>
                  <Select value={responsavelDelegacaoId || "__none__"} onValueChange={(v) => setResponsavelDelegacaoId(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Nenhum —</SelectItem>
                      {responsaveis.filter(r => delegationConfig?.usuarios_autorizados_ids?.includes(r.id)).map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Prazo para delegação</Label>
                  <Input type="date" value={prazoDelegacao} onChange={(e) => setPrazoDelegacao(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Observações para o delegador</Label>
                  <Textarea rows={3} value={obsDelegacao} onChange={(e) => setObsDelegacao(e.target.value)} placeholder="Instruções específicas para quem vai delegar..." />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}><Sparkles className="h-4 w-4 mr-1" /> Salvar reunião</Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={reprocDialog} onOpenChange={setReprocDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprocessar reunião com IA</AlertDialogTitle>
            <AlertDialogDescription>
              {(resumoCliente || resumoTarefas) && "Os resumos atuais serão sobrescritos. "}
              Como tratar as tarefas sugeridas pendentes desta reunião?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 text-xs">
            <button className="text-left border border-border rounded p-2 hover:bg-muted/40" onClick={() => { setReprocDialog(false); processarReuniao("manter", true); }}>
              <div className="font-medium">Manter tarefas existentes</div>
              <div className="text-muted-foreground">Não cria novas tarefas. Atualiza só os resumos.</div>
            </button>
            <button className="text-left border border-border rounded p-2 hover:bg-muted/40" onClick={() => { setReprocDialog(false); processarReuniao("substituir", true); }}>
              <div className="font-medium">Substituir tarefas pendentes</div>
              <div className="text-muted-foreground">Remove as tarefas ainda não aprovadas e gera novas. Tarefas já aprovadas não são tocadas.</div>
            </button>
            <button className="text-left border border-border rounded p-2 hover:bg-muted/40" onClick={() => { setReprocDialog(false); processarReuniao("novo", true); }}>
              <div className="font-medium">Gerar novas separadamente</div>
              <div className="text-muted-foreground">Mantém as existentes e adiciona as novas em paralelo.</div>
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function StatusPill({ ok, label }: { ok: boolean | null | undefined; label: string }) {
  if (ok === true) return <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> {label}</span>;
  if (ok === false) return <span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" /> {label}</span>;
  return <span className="inline-flex items-center gap-1 text-muted-foreground"><AlertTriangle className="h-3 w-3" /> {label}</span>;
}
