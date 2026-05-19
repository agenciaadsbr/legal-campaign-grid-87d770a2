import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Demanda } from "@/store/demandas";
import { CATEGORIA_LABEL } from "@/lib/demandas-categorias";

interface OperationalPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  previewData: any[]; // Estrutura de prévia do que será criado
  onConfirm: (data: any[]) => Promise<void>;
}

export function OperationalPreviewModal({ open, onOpenChange, clienteId, previewData, onConfirm }: OperationalPreviewModalProps) {
  const [data, setData] = useState(previewData);
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try {
      await onConfirm(data);
      onOpenChange(false);
      toast.success("Estrutura operacional gerada com sucesso!");
    } catch (e) {
      toast.error("Erro ao gerar estrutura");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Confirmar estrutura operacional</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {data.map((item, idx) => (
              <div key={idx} className="p-3 border rounded-md space-y-1">
                <div className="font-medium text-sm flex items-center justify-between">
                  <span>{item.titulo}</span>
                  <Badge variant={item.template_type === 'multi_step' ? 'secondary' : 'outline'}>
                    {item.template_type === 'multi_step' ? 'Multietapa' : 'Tarefa Única'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2">
                  <span>Área: {CATEGORIA_LABEL[item.categoria]}</span>
                  <span>Responsável: {item.responsavel_id || 'Não definido'}</span>
                </div>
                {item.subtarefas && (
                  <div className="pl-4 border-l-2 mt-2 space-y-1">
                    {item.subtarefas.map((s: any, sIdx: number) => (
                      <div key={sIdx} className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>• {s.nome}</span>
                        {s.depends_on && <Badge variant="outline" className="text-[10px]">Bloqueado</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirm} disabled={loading}>Confirmar e Gerar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
