import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { useCRM } from "@/store/crm";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ImportarClientesDialog({ open, onOpenChange }: Props) {
  const clientes = useCRM((s) => s.clientes);
  const updateCliente = useCRM((s) => s.updateCliente);
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);

  const disponiveis = useMemo(
    () =>
      clientes
        .filter((c) => (c.status_global ?? "Onboarding") !== "Onboarding")
        .filter((c) => !c.oculto)
        .filter((c) => c.nome_cliente.toLowerCase().includes(busca.toLowerCase()))
        .sort((a, b) => a.nome_cliente.localeCompare(b.nome_cliente)),
    [clientes, busca],
  );

  const toggle = (id: string) => {
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleConfirm = async () => {
    if (selecionados.size === 0) return;
    if (!confirm(
      `Você está prestes a enviar ${selecionados.size} cliente(s) para a Central de Ativação. ` +
      `Essa ação alterará o status desses clientes para Onboarding. Deseja continuar?`,
    )) return;
    setEnviando(true);
    let ok = 0;
    for (const id of selecionados) {
      try {
        await updateCliente(id, { status_global: "Onboarding" } as any);
        ok++;
      } catch (e) {
        console.error(e);
      }
    }
    setEnviando(false);
    toast.success(`${ok} cliente(s) enviado(s) para a Central de Ativação`);
    setSelecionados(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar clientes</DialogTitle>
          <DialogDescription>
            Selecione clientes existentes para enviar à Central de Ativação. O status global será alterado para Onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>

        <ScrollArea className="h-72 rounded-md border border-border">
          <div className="p-2">
            {disponiveis.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhum cliente disponível.</div>
            ) : disponiveis.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/40 cursor-pointer"
              >
                <Checkbox checked={selecionados.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{c.nome_cliente}</div>
                  <div className="text-xs text-muted-foreground">{c.status_global}</div>
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={selecionados.size === 0 || enviando}>
            {enviando ? "Enviando..." : `Confirmar envio (${selecionados.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
