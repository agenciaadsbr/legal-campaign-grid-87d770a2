import { useEffect, useState } from "react";
import { useIAConsultas, SetorPrompt } from "@/store/iaConsultas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Save, HelpCircle } from "lucide-react";
import { CATEGORIA_LABEL, DemandaCategoria } from "@/lib/demandas-categorias";

const SETORES: string[] = [
  "Posts",
  "EditorVideo",
  "TrafegoPago",
  "LandingPage",
  "IAAtendimento",
  "Personalizado",
  "Planejamento",
  "Operacional",
  "Suporte",
];

const LABEL_SETOR: Record<string, string> = {
  Posts: "Posts",
  ...CATEGORIA_LABEL,
};

export function IAPromptSetorManager() {
  const { setorPrompts, loadSetorPrompts, upsertSetorPrompt, loaded } = useIAConsultas();

  useEffect(() => {
    if (!loaded) loadSetorPrompts();
  }, [loaded]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground mb-4">
        <HelpCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Personalize como a IA deve responder às dúvidas de cada setor. 
          Use os prompts para dar contexto sobre o que é esperado nas entregas e como interpretar as reuniões.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SETORES.map((setor) => {
          const prompt = setorPrompts.find((p) => p.setor === setor);
          return (
            <PromptSetorRow 
              key={setor} 
              setor={setor} 
              label={CATEGORIA_LABEL[setor]} 
              prompt={prompt} 
              onSave={upsertSetorPrompt} 
            />
          );
        })}
      </div>
    </div>
  );
}

function PromptSetorRow({ setor, label, prompt, onSave }: { 
  setor: string; 
  label: string; 
  prompt?: SetorPrompt; 
  onSave: (setor: string, prompt: string) => Promise<void> 
}) {
  const [conteudo, setConteudo] = useState(prompt?.prompt ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prompt?.prompt) setConteudo(prompt.prompt);
  }, [prompt]);

  const handleSave = async () => {
    setLoading(true);
    await onSave(setor, conteudo);
    setLoading(false);
  };

  return (
    <Card className="overflow-hidden border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted uppercase tracking-wider">
            {setor}
          </span>
        </div>
        
        <Textarea 
          value={conteudo} 
          onChange={(e) => setConteudo(e.target.value)} 
          placeholder={`Instruções para a IA responder sobre ${label}...`}
          className="text-xs min-h-[100px] bg-background/50 focus:bg-background"
        />
        
        <div className="flex justify-end">
          <Button 
            size="sm" 
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={handleSave}
            disabled={loading || (prompt?.prompt === conteudo)}
          >
            <Save className="h-3.5 w-3.5" />
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
