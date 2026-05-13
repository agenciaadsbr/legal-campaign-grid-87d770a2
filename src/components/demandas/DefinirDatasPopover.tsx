import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "lucide-react";
import { toast } from "sonner";

interface Props {
  count: number;
  onApply: (datas: { data_inicio?: string; data_limite?: string }) => Promise<void> | void;
  disabled?: boolean;
}

export function DefinirDatasPopover({ count, onApply, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataLimite, setDataLimite] = useState("");
  const [aplicando, setAplicando] = useState(false);

  const aplicar = async () => {
    if (!dataInicio && !dataLimite) {
      toast.error("Selecione ao menos uma data");
      return;
    }

    if (dataInicio && dataLimite && dataLimite < dataInicio) {
      toast.error("A data limite não pode ser anterior à data de início");
      return;
    }

    setAplicando(true);
    try {
      await onApply({
        data_inicio: dataInicio || undefined,
        data_limite: dataLimite || undefined,
      });
      setDataInicio("");
      setDataLimite("");
      setOpen(false);
    } finally {
      setAplicando(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={disabled || count === 0}
        >
          <Calendar className="h-3.5 w-3.5 mr-1.5" />
          Definir datas
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-4">
          <div className="text-sm font-semibold">Definir datas em massa</div>
          
          <div className="space-y-2">
            <Label className="text-xs">Data de início da tarefa</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Data limite da tarefa</Label>
            <Input
              type="date"
              value={dataLimite}
              onChange={(e) => setDataLimite(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <Button
            onClick={aplicar}
            disabled={(!dataInicio && !dataLimite) || count === 0 || aplicando}
            className="w-full h-8 text-xs"
            size="sm"
          >
            {aplicando ? "Aplicando..." : `Aplicar em ${count} ${count === 1 ? "tarefa" : "tarefas"}`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
