import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useCRM } from "@/store/crm";
import { Loader2 } from "lucide-react";

interface CriarCicloModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
}

export function CriarCicloModal({ open, onOpenChange, clienteId }: CriarCicloModalProps) {
  const { createCicloPosts } = useCRM();
  const [tipo, setTipo] = useState<"mensal" | "trimestral" | "semestral">("mensal");
  const [observacao, setObservacao] = useState("");
  const [criarAlerta, setCriarAlerta] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [loading, setLoading] = useState(false);

  const qtdPosts = tipo === "mensal" ? 4 : tipo === "trimestral" ? 12 : 24;

  const handleCriar = async () => {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }

    setLoading(true);
    try {
      await createCicloPosts({
        cliente_id: clienteId,
        tipo,
        observacao,
        criar_alerta: criarAlerta,
      });
      onOpenChange(false);
      // Reset state
      setTipo("mensal");
      setObservacao("");
      setCriarAlerta(false);
      setConfirmando(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (loading) return;
      onOpenChange(v);
      setConfirmando(false);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar ciclo de posts</DialogTitle>
          <DialogDescription>
            {confirmando 
              ? `Você está prestes a criar ${qtdPosts} novos posts em Planejamento para este cliente. Deseja continuar?`
              : "Selecione o tipo de ciclo para gerar novos cards de post."}
          </DialogDescription>
        </DialogHeader>

        {!confirmando && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tipo">Tipo de ciclo</Label>
              <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Selecione o ciclo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal (4 posts)</SelectItem>
                  <SelectItem value="trimestral">Trimestral (12 posts)</SelectItem>
                  <SelectItem value="semestral">Semestral (24 posts)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="obs">Observação opcional</Label>
              <Textarea 
                id="obs" 
                placeholder="Detalhes sobre a renovação ou ciclo..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="alerta" 
                checked={criarAlerta}
                onCheckedChange={(v) => setCriarAlerta(!!v)}
              />
              <Label htmlFor="alerta" className="text-sm font-medium leading-none cursor-pointer">
                Criar alerta de renovação
              </Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            if (confirmando) setConfirmando(false);
            else onOpenChange(false);
          }} disabled={loading}>
            {confirmando ? "Voltar" : "Cancelar"}
          </Button>
          <Button onClick={handleCriar} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmando ? "Confirmar e Criar" : "Criar ciclo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
