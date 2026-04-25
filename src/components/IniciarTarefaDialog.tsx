import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCRM } from "@/store/crm";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cardId: string | null;
}

// Detecta título genérico (placeholder gerado automaticamente)
const isPlaceholderTitle = (t: string) => /^Post Mês \d+ - Semana \d+$/i.test(t.trim());

export function IniciarTarefaDialog({ open, onOpenChange, cardId }: Props) {
  const { cards, responsaveis, iniciarTarefa } = useCRM();
  const card = cards.find((c) => c.id === cardId);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [selResp, setSelResp] = useState<string[]>([]);
  const [prazo, setPrazo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && card) {
      setTitulo(isPlaceholderTitle(card.titulo_card) ? "" : card.titulo_card);
      setDescricao(card.descricao ?? "");
      setSelResp(card.responsaveis ?? []);
      setPrazo(card.data_agendada ? card.data_agendada.slice(0, 10) : "");
    }
  }, [open, card]);

  const toggleResp = (id: string) => {
    setSelResp((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const confirmar = async () => {
    if (!cardId) return;
    if (!titulo.trim()) {
      toast.error("Defina um título para a tarefa");
      return;
    }
    setSaving(true);
    await iniciarTarefa(cardId, {
      responsaveis: selResp,
      data_agendada: prazo ? new Date(prazo + "T12:00:00").toISOString() : null,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" /> Iniciar tarefa
          </DialogTitle>
          <DialogDescription>
            {card ? `Referência: Post Mês ${card.mes_referencia} · Semana ${card.numero_semana}` : "Ative este card para começar a trabalhar nele."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">
              Título da tarefa <span className="text-destructive">*</span>
            </Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Criar arte carrossel sobre aposentadoria rural"
              autoFocus
            />
          </div>

          <div>
            <Label className="text-xs">Briefing / atividade (opcional)</Label>
            <Textarea
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes internos: cores do cliente, CTA no último slide, tom formal, referências..."
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Esta informação fica visível apenas dentro do card.
            </p>
          </div>

          <div>
            <Label className="text-xs">Responsáveis</Label>
            <div className="mt-1.5 max-h-40 overflow-auto border rounded-md p-2 space-y-0.5">
              {responsaveis.map((r) => {
                const checked = selResp.includes(r.id);
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => toggleResp(r.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm",
                      checked && "bg-accent",
                    )}
                  >
                    <Checkbox checked={checked} />
                    <div
                      className="h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: r.cor }}
                    >
                      {r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <span className="truncate">{r.nome}</span>
                  </button>
                );
              })}
              {responsaveis.length === 0 && (
                <div className="text-xs text-muted-foreground px-2 py-3 text-center">
                  Nenhum responsável cadastrado
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Prazo de criação</Label>
            <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={saving}>
            {saving ? "Iniciando..." : "Iniciar tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
