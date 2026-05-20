import { useState } from "react";
import { BarChart3, ExternalLink, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCRM } from "@/store/crm";
import { toast } from "sonner";

interface Props {
  clienteId: string;
  value?: string | null;
}

export function RelatorioHeaderButton({ clienteId, value }: Props) {
  const { updateCliente } = useCRM();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(value ?? "");

  const handleSave = async () => {
    const novo = v.trim() || null;
    await updateCliente(clienteId, { link_relatorio: novo } as any);
    toast.success(novo ? "Relatório atualizado" : "Link de relatório removido");
    setOpen(false);
  };

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) setV(value ?? "");
  };

  if (value) {
    return (
      <div className="inline-flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="h-7 gap-1.5 text-xs"
        >
          <a href={value} target="_blank" rel="noreferrer">
            <BarChart3 className="h-3.5 w-3.5" />
            Relatório
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
        </Button>
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="Editar link do relatório"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2 space-y-2">
            <Input
              type="url"
              placeholder="https://..."
              value={v}
              onChange={(e) => setV(e.target.value)}
              className="h-8 text-xs"
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" className="h-7" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="h-7" onClick={handleSave}>
                Salvar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar relatório
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2 space-y-2">
        <Input
          type="url"
          placeholder="https://..."
          value={v}
          onChange={(e) => setV(e.target.value)}
          className="h-8 text-xs"
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" className="h-7" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" className="h-7" onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
