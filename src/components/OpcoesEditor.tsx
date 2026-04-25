import { useCRM, DropdownOption } from "@/store/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Converte HSL string ("hsl(240, 70%, 50%)") ou hex para hex (input color só aceita hex)
export function toHex(color: string): string {
  if (color.startsWith("#")) return color.length === 7 ? color : "#3b82f6";
  const m = color.match(/hsl\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)%[,\s]+(\d+(?:\.\d+)?)%/i);
  if (!m) return "#3b82f6";
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHexByte = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

interface Props {
  tipo: "status" | "nicho";
}

export function OpcoesEditor({ tipo }: Props) {
  const {
    nichos,
    statusOptions,
    clientes,
    addNicho,
    updateNicho,
    deleteNicho,
    addStatusOption,
    updateStatusOption,
    deleteStatusOption,
  } = useCRM();

  const cfg =
    tipo === "status"
      ? {
          itens: statusOptions,
          contagemUso: (label: string) => clientes.filter((c) => c.status_cliente === label).length,
          onAdd: addStatusOption,
          onUpdate: updateStatusOption,
          onDelete: deleteStatusOption,
          rotuloSingular: "Status",
          placeholder: "Novo status",
        }
      : {
          itens: nichos,
          contagemUso: (label: string) => clientes.filter((c) => c.nicho === label).length,
          onAdd: addNicho,
          onUpdate: updateNicho,
          onDelete: deleteNicho,
          rotuloSingular: "Nicho",
          placeholder: "Novo nicho",
        };

  const { itens, contagemUso, onAdd, onUpdate, onDelete, rotuloSingular, placeholder } = cfg;

  const mostrarCor = tipo === "status";

  const [editando, setEditando] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCor, setEditCor] = useState("#3b82f6");
  const [novoLabel, setNovoLabel] = useState("");
  const [novaCor, setNovaCor] = useState("#3b82f6");

  const iniciarEdicao = (it: DropdownOption) => {
    setEditando(it.label);
    setEditLabel(it.label);
    setEditCor(toHex(it.cor));
  };
  const cancelarEdicao = () => {
    setEditando(null);
    setEditLabel("");
  };
  const salvarEdicao = (oldLabel: string) => {
    const novo = editLabel.trim();
    if (!novo) {
      toast.error("Nome não pode ficar vazio");
      return;
    }
    const cor = mostrarCor ? editCor : "#9ca3af";
    const r = onUpdate(oldLabel, { label: novo, cor });
    if (r === -1) {
      toast.error(`Já existe um ${rotuloSingular} com esse nome`);
      return;
    }
    cancelarEdicao();
    toast.success(r > 0 ? `${rotuloSingular} atualizado — ${r} cliente(s) afetado(s)` : `${rotuloSingular} atualizado`);
  };
  const adicionar = () => {
    const nome = novoLabel.trim();
    if (!nome) return;
    const cor = mostrarCor ? novaCor : "#9ca3af";
    const ok = onAdd({ label: nome, cor });
    if (!ok) {
      toast.error(`Já existe um ${rotuloSingular} com esse nome`);
      return;
    }
    setNovoLabel("");
    setNovaCor("#3b82f6");
    toast.success(`${rotuloSingular} adicionado`);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {itens.map((it) => {
          const usoCount = contagemUso(it.label);
          if (editando === it.label) {
            return (
              <div key={it.label} className="flex items-center gap-2 p-2 rounded-md border bg-card">
                <input
                  type="color"
                  value={editCor}
                  onChange={(e) => setEditCor(e.target.value)}
                  className="h-8 w-10 rounded cursor-pointer border bg-transparent"
                  aria-label="Cor"
                />
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") salvarEdicao(it.label);
                    if (e.key === "Escape") cancelarEdicao();
                  }}
                  className="h-8 text-sm flex-1"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => salvarEdicao(it.label)} title="Salvar">
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelarEdicao} title="Cancelar">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          }
          return (
            <div key={it.label} className="flex items-center gap-2 p-2 rounded-md border bg-card group">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs flex-1 border"
                style={{ backgroundColor: `${it.cor}1f`, color: it.cor, borderColor: `${it.cor}4d` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: it.cor }} />
                {it.label}
              </span>
              {usoCount > 0 && <span className="text-[10px] text-muted-foreground">{usoCount} uso(s)</span>}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => iniciarEdicao(it)} title="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Excluir">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir “{it.label}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {usoCount > 0
                        ? `Esta opção está em uso por ${usoCount} cliente(s). Eles ficarão sem esta classificação.`
                        : "Esta ação não pode ser desfeita."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        const n = onDelete(it.label);
                        toast.success(
                          n > 0 ? `${rotuloSingular} removido — ${n} cliente(s) afetado(s)` : `${rotuloSingular} removido`
                        );
                      }}
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-1 border-t">
        <input
          type="color"
          value={novaCor}
          onChange={(e) => setNovaCor(e.target.value)}
          className="h-9 w-12 rounded cursor-pointer border bg-transparent"
          aria-label="Cor do novo item"
        />
        <Input
          value={novoLabel}
          onChange={(e) => setNovoLabel(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          className="h-9"
        />
        <Button onClick={adicionar} className="gap-1">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>
    </div>
  );
}
