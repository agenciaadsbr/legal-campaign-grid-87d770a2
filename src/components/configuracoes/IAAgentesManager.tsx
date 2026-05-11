import { useEffect, useState } from "react";
import { useIAAgentes, useIAAgentesBootstrap, type IAAgente, type AgenteTipo } from "@/store/iaAgentes";
import { useIAConfig } from "@/store/iaConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Save, User, Cog } from "lucide-react";

const META: Record<AgenteTipo, { titulo: string; subtitulo: string; icon: any; promptHint: string }> = {
  resumo_cliente: {
    titulo: "Agente Resumo Cliente",
    subtitulo: "Gera resumo simples e amigável para enviar ao cliente (estilo ata, pronto pra WhatsApp).",
    icon: User,
    promptHint: "Você é um assistente que escreve resumos curtos para o cliente...",
  },
  operacional: {
    titulo: "Agente Operacional",
    subtitulo: "Analisa profundamente a transcrição e gera briefing operacional + tarefas detalhadas.",
    icon: Cog,
    promptHint: "Você é um coordenador operacional que extrai contexto, decisões, tarefas...",
  },
};

export function IAAgentesManager() {
  useIAAgentesBootstrap();
  const agentes = useIAAgentes((s) => s.agentes);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Cada agente é independente: provedor, modelo, prompt e temperatura próprios. Eles NÃO compartilham contexto entre si.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AgenteCard tipo="resumo_cliente" agente={agentes.find((a) => a.tipo === "resumo_cliente")} />
        <AgenteCard tipo="operacional" agente={agentes.find((a) => a.tipo === "operacional")} />
      </div>
    </div>
  );
}

function AgenteCard({ tipo, agente }: { tipo: AgenteTipo; agente?: IAAgente }) {
  const upsert = useIAAgentes((s) => s.upsert);
  const configs = useIAConfig((s) => s.configs);
  const meta = META[tipo];
  const Icon = meta.icon;

  const [nome, setNome] = useState(agente?.nome ?? meta.titulo);
  const [provider, setProvider] = useState(agente?.provider ?? "gpt");
  const [model, setModel] = useState<string>(agente?.model ?? "");
  const [prompt, setPrompt] = useState(agente?.prompt ?? "");
  const [temperatura, setTemperatura] = useState<number>(Number(agente?.temperatura ?? 0.4));
  const [contexto, setContexto] = useState(agente?.contexto_adicional ?? "");
  const [regrasCat, setRegrasCat] = useState(agente?.regras_categorizacao ?? "");
  const [regrasResp, setRegrasResp] = useState(agente?.regras_responsaveis ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!agente) return;
    setNome(agente.nome);
    setProvider(agente.provider);
    setModel(agente.model ?? "");
    setPrompt(agente.prompt);
    setTemperatura(Number(agente.temperatura));
    setContexto(agente.contexto_adicional ?? "");
    setRegrasCat(agente.regras_categorizacao ?? "");
    setRegrasResp(agente.regras_responsaveis ?? "");
  }, [agente]);

  const cfgProvider = configs.find((c) => c.provider === provider);
  const modelos = (cfgProvider?.modelos_disponiveis as any[] | null) ?? [];

  const handleSave = async () => {
    setBusy(true);
    await upsert({
      tipo,
      nome,
      provider,
      model: model || null,
      prompt,
      temperatura,
      contexto_adicional: contexto || null,
      regras_categorizacao: tipo === "operacional" ? (regrasCat || null) : null,
      regras_responsaveis: tipo === "operacional" ? (regrasResp || null) : null,
    });
    setBusy(false);
  };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="flex items-start gap-3 p-4 border-b border-border">
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">{meta.titulo}</div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{meta.subtitulo}</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <Label className="text-xs">Nome do agente</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-8 text-xs" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Provider</Label>
            <Select value={provider} onValueChange={(v) => { setProvider(v); setModel(""); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt" className="text-xs">OpenAI / GPT</SelectItem>
                <SelectItem value="gemini" className="text-xs">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Modelo</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {modelos.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Atualize modelos na aba Provedor</div>
                )}
                {modelos.map((m: any) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Temperatura</Label>
            <span className="text-xs text-muted-foreground tabular-nums">{temperatura.toFixed(2)}</span>
          </div>
          <Slider value={[temperatura]} min={0} max={1} step={0.05} onValueChange={(v) => setTemperatura(v[0])} className="mt-2" />
        </div>

        <div>
          <Label className="text-xs">Prompt (system)</Label>
          <Textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={meta.promptHint} className="text-xs" />
        </div>

        <div>
          <Label className="text-xs">Contexto adicional</Label>
          <Textarea rows={3} value={contexto} onChange={(e) => setContexto(e.target.value)} placeholder="Instruções extras, exemplos, restrições..." className="text-xs" />
        </div>

        {tipo === "operacional" && (
          <>
            <div>
              <Label className="text-xs">Regras de categorização</Label>
              <Textarea rows={3} value={regrasCat} onChange={(e) => setRegrasCat(e.target.value)} placeholder="Categorias possíveis, como decidir entre elas..." className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">Regras de responsáveis</Label>
              <Textarea rows={3} value={regrasResp} onChange={(e) => setRegrasResp(e.target.value)} placeholder="A IA consulta Configurações → Responsabilidades da Equipe automaticamente. Adicione aqui regras extras." className="text-xs" />
            </div>
          </>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={busy}>
            <Save className="h-3.5 w-3.5 mr-1" /> Salvar agente
          </Button>
        </div>
      </div>
    </div>
  );
}
