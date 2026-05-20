import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, FilePlus2, Loader2 } from "lucide-react";
import { CARD_PAI_TEMPLATES, CardPaiTemplateId } from "@/lib/cardPaiTemplates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Chamado quando o usuário escolhe um modelo OU "em branco" (templateId=null). */
  onSelect: (templateId: CardPaiTemplateId | null) => Promise<void> | void;
}

export function EscolherModeloCardPaiDialog({ open, onOpenChange, onSelect }: Props) {
  const [loading, setLoading] = useState<CardPaiTemplateId | "blank" | null>(null);

  async function handle(id: CardPaiTemplateId | null) {
    setLoading(id ?? "blank");
    try {
      await onSelect(id);
      onOpenChange(false);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Escolha o modelo do processo</DialogTitle>
          <DialogDescription>
            Selecione um modelo pronto para criar o Card Pai já com as etapas, responsáveis e
            dependências preenchidos. Você pode editar tudo depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {CARD_PAI_TEMPLATES.map((tpl) => (
            <Card
              key={tpl.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => !loading && handle(tpl.id)}
            >
              <CardContent className="p-3 flex items-start gap-3">
                <div className="mt-0.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{tpl.label}</div>
                  <div className="text-xs text-muted-foreground">{tpl.descricao}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {tpl.steps.length} etapas
                  </div>
                </div>
                {loading === tpl.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </CardContent>
            </Card>
          ))}

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => !loading && handle(null)}
          >
            <CardContent className="p-3 flex items-start gap-3">
              <div className="mt-0.5">
                <FilePlus2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">Card Pai em branco</div>
                <div className="text-xs text-muted-foreground">
                  Cria um Card Pai vazio para você adicionar etapas manualmente.
                </div>
              </div>
              {loading === "blank" && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={!!loading}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
