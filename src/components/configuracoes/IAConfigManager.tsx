import { useEffect, useState } from "react";
import { useIAConfig, useIAConfigBootstrap } from "@/store/iaConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { IAProviderCard } from "./IAProviderCard";

const TIPOS_PROMPT = [
  { value: "resumo_cliente", label: "Resumo cliente (estilo ata, curto)" },
  { value: "resumo_operacional", label: "Resumo operacional (técnico, detalhado)" },
  { value: "tarefas_sugeridas", label: "Geração de tarefas sugeridas" },
];

const PROVIDERS = [
  { value: "gemini", label: "Google Gemini" },
  { value: "gpt", label: "OpenAI GPT" },
];

export function IAConfigManager() {
  useIAConfigBootstrap();
  const configs = useIAConfig((s) => s.configs);
  const prompts = useIAConfig((s) => s.prompts);
  const logs = useIAConfig((s) => s.logs);
  const upsertConfig = useIAConfig((s) => s.upsertConfig);
  const upsertPrompt = useIAConfig((s) => s.upsertPrompt);

  return (
    <Card>
      <CardHeader className="p-4"><CardTitle className="text-sm">Inteligência Artificial</CardTitle></CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-xs text-muted-foreground mb-3">
          Estrutura preparada para IA. As chaves de API devem ser cadastradas como secrets — nada é executado automaticamente ainda.
        </p>

        <Tabs defaultValue="provider">
          <TabsList className="h-8">
            <TabsTrigger value="provider" className="text-xs h-7">Provedor</TabsTrigger>
            <TabsTrigger value="prompts" className="text-xs h-7">Prompts</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs h-7">Logs / consumo</TabsTrigger>
          </TabsList>

          <TabsContent value="provider" className="mt-3 space-y-3">
            {PROVIDERS.map((p) => {
              const c = configs.find((x) => x.provider === p.value);
              return <ProviderRow key={p.value} provider={p} cfg={c} onSave={upsertConfig} />;
            })}
          </TabsContent>

          <TabsContent value="prompts" className="mt-3 space-y-3">
            {TIPOS_PROMPT.map((t) => {
              const p = prompts.find((x) => x.tipo === t.value);
              return <PromptRow key={t.value} tipo={t} prompt={p} onSave={upsertPrompt} />;
            })}
          </TabsContent>

          <TabsContent value="logs" className="mt-3">
            {logs.length === 0 ? (
              <div className="text-xs text-muted-foreground py-6 text-center">Nenhum log ainda.</div>
            ) : (
              <div className="space-y-1 text-xs">
                {logs.map((l) => (
                  <div key={l.id} className="flex items-center justify-between border-b border-border/60 py-1.5">
                    <div>
                      <span className="font-medium">{l.tipo}</span>
                      <span className="text-muted-foreground ml-2">{l.modelo}</span>
                    </div>
                    <div className="text-muted-foreground tabular-nums">
                      {l.tokens_input ?? 0}↓ {l.tokens_output ?? 0}↑ {l.custo ? `$${l.custo}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ProviderRow({ provider, cfg, onSave }: any) {
  const [model, setModel] = useState(cfg?.model ?? "");
  const [ativo, setAtivo] = useState(cfg?.ativo ?? false);
  useEffect(() => { setModel(cfg?.model ?? ""); setAtivo(cfg?.ativo ?? false); }, [cfg]);
  return (
    <div className="border border-border rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{provider.label}</div>
          <div className="text-[10px] text-muted-foreground">Provider id: {provider.value}</div>
        </div>
        <Switch checked={ativo} onCheckedChange={setAtivo} />
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">Modelo</Label>
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={provider.value === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini"} className="h-8" />
        </div>
        <Button size="sm" onClick={() => onSave({ provider: provider.value, model, ativo })}>
          <Save className="h-3.5 w-3.5 mr-1" /> Salvar
        </Button>
      </div>
    </div>
  );
}

function PromptRow({ tipo, prompt, onSave }: any) {
  const [conteudo, setConteudo] = useState(prompt?.conteudo ?? "");
  const [ativo, setAtivo] = useState(prompt?.ativo ?? true);
  useEffect(() => { setConteudo(prompt?.conteudo ?? ""); setAtivo(prompt?.ativo ?? true); }, [prompt]);
  return (
    <div className="border border-border rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{tipo.label}</div>
        <Switch checked={ativo} onCheckedChange={setAtivo} />
      </div>
      <Textarea rows={4} value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="Você é um assistente que..." />
      <div className="flex justify-end">
        <Button size="sm" onClick={() => onSave({ tipo: tipo.value, conteudo, ativo })}>
          <Save className="h-3.5 w-3.5 mr-1" /> Salvar
        </Button>
      </div>
    </div>
  );
}
