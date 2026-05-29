import { useState } from "react";
import { Responsavel } from "@/store/crm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModoAtribuicao = "substituir" | "adicionar";

export interface AtribuicaoPostsPayload {
  /** ids para "Responsáveis pela criação" — vazio = não alterar */
  criacao: string[];
  /** ids para "Responsáveis pela postagem" — vazio = não alterar */
  postagem: string[];
  modo: ModoAtribuicao;
}

interface Props {
  responsaveis: Responsavel[];
  count: number;
  /** Modo simples (legado): uma única lista. */
  onApply?: (ids: string[], modo: ModoAtribuicao) => Promise<void> | void;
  /** Modo Posts: lista separada para criação e postagem. */
  onApplyPosts?: (payload: AtribuicaoPostsPayload) => Promise<void> | void;
  /** Habilita seleção dupla "criação" + "postagem". */
  postsMode?: boolean;
  disabled?: boolean;
}

export function AtribuirResponsaveisPopover({
  responsaveis,
  count,
  onApply,
  onApplyPosts,
  postsMode = false,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selCriacao, setSelCriacao] = useState<string[]>([]);
  const [selPostagem, setSelPostagem] = useState<string[]>([]);
  const [modo, setModo] = useState<ModoAtribuicao>("substituir");
  const [aplicando, setAplicando] = useState(false);

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    id: string,
  ) =>
    setter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const podeAplicar = postsMode
    ? selCriacao.length > 0 || selPostagem.length > 0
    : selCriacao.length > 0;

  const aplicar = async () => {
    if (!podeAplicar || count === 0) return;
    setAplicando(true);
    try {
      if (postsMode && onApplyPosts) {
        await onApplyPosts({ criacao: selCriacao, postagem: selPostagem, modo });
      } else if (onApply) {
        await onApply(selCriacao, modo);
      }
      setSelCriacao([]);
      setSelPostagem([]);
      setOpen(false);
    } finally {
      setAplicando(false);
    }
  };

  const renderLista = (
    selecionados: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => (
    <div className="max-h-44 overflow-auto space-y-0.5 -mx-1 px-1">
      {responsaveis.map((r) => {
        const checked = selecionados.includes(r.id);
        return (
          <button
            type="button"
            key={r.id}
            onClick={() => toggle(setter, r.id)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm",
              checked && "bg-accent",
            )}
          >
            <Checkbox checked={checked} />
            <div
              className="h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0 overflow-hidden"
              style={{ backgroundColor: r.avatar_url ? undefined : r.cor }}
            >
              {r.avatar_url ? (
                <img src={r.avatar_url} alt={r.nome} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")
              )}
            </div>
            <span className="truncate">{r.nome}</span>
          </button>
        );
      })}
      {responsaveis.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhum responsável disponível
        </p>
      )}
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="default"
          className="h-8"
          disabled={disabled || count === 0}
        >
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Atribuir responsáveis
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold mb-1.5">Modo</div>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-0.5">
              <button
                type="button"
                onClick={() => setModo("substituir")}
                className={cn(
                  "text-xs py-1.5 rounded transition-colors",
                  modo === "substituir"
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Substituir
              </button>
              <button
                type="button"
                onClick={() => setModo("adicionar")}
                className={cn(
                  "text-xs py-1.5 rounded transition-colors",
                  modo === "adicionar"
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Adicionar
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
              {modo === "substituir"
                ? "Os selecionados substituirão os atuais."
                : "Os selecionados serão somados aos atuais."}
            </p>
          </div>

          {postsMode ? (
            <>
              <div>
                <div className="text-xs font-semibold mb-1.5">
                  Responsáveis pela criação
                </div>
                {renderLista(selCriacao, setSelCriacao)}
              </div>
              <div className="pt-2 border-t border-border/60">
                <div className="text-xs font-semibold mb-1.5">
                  Responsáveis pela postagem
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mb-1.5">
                  Quem fica responsável por agendar/postar no Meta Business Suite.
                </p>
                {renderLista(selPostagem, setSelPostagem)}
              </div>
            </>
          ) : (
            <div>
              <div className="text-xs font-semibold mb-1.5">Responsáveis</div>
              {renderLista(selCriacao, setSelCriacao)}
            </div>
          )}

          <Button
            onClick={aplicar}
            disabled={!podeAplicar || count === 0 || aplicando}
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
