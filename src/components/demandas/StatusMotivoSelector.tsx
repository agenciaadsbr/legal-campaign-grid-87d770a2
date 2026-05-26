import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStatusMotivosStore, type MotivoTipo } from "@/store/statusMotivos";

interface Props {
  tipo: MotivoTipo;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
}

export function StatusMotivoSelector({ tipo, value, onChange }: Props) {
  const { cliente, interno, loaded, load, add } = useStatusMotivosStore();
  const [open, setOpen] = useState(false);
  const [novo, setNovo] = useState("");

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const lista = tipo === "cliente" ? cliente : interno;
  const ativos = lista.filter((m) => m.ativo);

  const placeholder =
    tipo === "cliente" ? "Selecione a ação aguardada" : "Selecione a etapa interna";
  const labelNovo =
    tipo === "cliente" ? "+ Criar nova ação aguardada" : "+ Criar nova etapa interna";

  const criar = async () => {
    const created = await add(tipo, novo);
    if (created) {
      onChange(created.label);
      setNovo("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs justify-start font-normal"
        >
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="max-h-64 overflow-auto space-y-0.5">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="w-full text-left text-xs px-2 py-1 rounded text-muted-foreground hover:bg-accent"
            >
              — Limpar —
            </button>
          )}
          {ativos.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChange(m.label);
                setOpen(false);
              }}
              className="w-full text-left text-xs px-2 py-1 rounded hover:bg-accent"
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="border-t mt-2 pt-2 flex gap-1">
          <Input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            placeholder={labelNovo}
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                criar();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={criar}
            disabled={!novo.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
