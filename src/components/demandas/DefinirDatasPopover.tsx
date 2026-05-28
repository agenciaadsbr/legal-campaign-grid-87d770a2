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

export interface DatasMassaPayload {
  data_inicio?: string;
  data_limite?: string;
  /** Apenas em modo Posts: data em que o post foi/será agendado. */
  data_agendamento?: string;
  /** Apenas em modo Posts: data real ou prevista de publicação. */
  data_postagem?: string;
}

interface Props {
  count: number;
  onApply: (datas: DatasMassaPayload) => Promise<void> | void;
  disabled?: boolean;
  /** Habilita seção "Datas do post" (agendamento e postagem). */
  postsMode?: boolean;
}

export function DefinirDatasPopover({ count, onApply, disabled, postsMode = false }: Props) {
  const [open, setOpen] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataLimite, setDataLimite] = useState("");
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [dataPostagem, setDataPostagem] = useState("");
  const [aplicando, setAplicando] = useState(false);

  const aplicar = async () => {
    if (!dataInicio && !dataLimite && !dataAgendamento && !dataPostagem) {
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
        data_agendamento: dataAgendamento || undefined,
        data_postagem: dataPostagem || undefined,
      });
      setDataInicio("");
      setDataLimite("");
      setDataAgendamento("");
      setDataPostagem("");
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
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-4">
          <div className="text-sm font-semibold">Definir datas em massa</div>

          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Datas da tarefa
            </div>
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
          </div>

          {postsMode && (
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Datas do post
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Data limite é o prazo da tarefa. Data de postagem é a data real ou prevista da publicação.
              </p>
              <div className="space-y-2">
                <Label className="text-xs">Data de agendamento</Label>
                <Input
                  type="date"
                  value={dataAgendamento}
                  onChange={(e) => setDataAgendamento(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Data de postagem</Label>
                <Input
                  type="date"
                  value={dataPostagem}
                  onChange={(e) => setDataPostagem(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          <Button
            onClick={aplicar}
            disabled={(!dataInicio && !dataLimite && !dataAgendamento && !dataPostagem) || count === 0 || aplicando}
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
