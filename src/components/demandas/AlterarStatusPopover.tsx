import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LayoutGrid } from "lucide-react";
import { DropdownOption } from "@/store/crm";
import { cn } from "@/lib/utils";
import { displayStatusPostLabel } from "@/lib/statusDisplay";

interface Props {
  count: number;
  options: DropdownOption[];
  onApply: (status: string) => Promise<void> | void;
  disabled?: boolean;
}

export function AlterarStatusPopover({ count, options, onApply, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  const aplicar = async (status: string) => {
    setAplicando(true);
    try {
      await onApply(status);
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
          <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
          Alterar status
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="space-y-1">
          <div className="text-[11px] text-muted-foreground px-2 pb-1.5 font-medium uppercase">
            Mover para status
          </div>
          <div className="space-y-0.5">
            {options.map((opt) => (
              <button
                key={opt.label}
                disabled={aplicando}
                onClick={() => aplicar(opt.label)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm transition-colors",
                  aplicando && "opacity-50 cursor-not-allowed"
                )}
              >
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: opt.cor }}
                />
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
