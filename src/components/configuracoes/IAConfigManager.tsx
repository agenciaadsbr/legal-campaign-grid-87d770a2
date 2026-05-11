import { useEffect, useState } from "react";
import { useIAConfig, useIAConfigBootstrap } from "@/store/iaConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { IAProviderCard } from "./IAProviderCard";
import { IAAgentesManager } from "./IAAgentesManager";

const TIPOS_PROMPT = [
  { value: "resumo_cliente", label: "Resumo cliente (estilo ata, curto)" },
  { value: "resumo_operacional", label: "Resumo operacional (técnico, detalhado)" },
  { value: "tarefas_sugeridas", label: "Geração de tarefas sugeridas" },
];

export function IAConfigManager() {
  useIAConfigBootstrap();
  const prompts = useIAConfig((s) => s.prompts);
  const logs = useIAConfig((s) => s.logs);
  const upsertPrompt = useIAConfig((s) => s.upsertPrompt);

  return (
    <Card>
      <CardHeader className="p-4"><CardTitle className="text-sm">Inteligência Artificial</CardTitle></CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-xs text-muted-foreground mb-3">
          IA conectada via Lovable AI Gateway — sem necessidade de cadastrar chaves manualmente. Ative o provedor desejado, escolha o modelo e use os botões dentro das reuniões para gerar resumos e tarefas.
        </p>

        <Tabs defaultValue="provider">
          <TabsList className="h-8">
            <TabsTrigger value="provider" className="text-xs h-7">Provedor</TabsTrigger>
            <TabsTrigger value="agentes" className="text-xs h-7">Agentes</TabsTrigger>
            <TabsTrigger value="prompts" className="text-xs h-7">Prompts</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs h-7">Logs / consumo</TabsTrigger>
          </TabsList>

          <TabsContent value="provider" className="mt-3 space-y-3">
            <IAProviderCard provider="gpt" />
            <IAProviderCard provider="gemini" />
          </TabsContent>

          <TabsContent value="agentes" className="mt-3">
            <IAAgentesManager />
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
