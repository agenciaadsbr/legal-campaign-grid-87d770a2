import { useCRM, Comentario } from "@/store/crm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Pencil, Trash2, Send, MessageSquarePlus, X, Check,
  Plus, Image as ImageIcon, Smile, AtSign,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Props {
  clienteId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const fileToDataUrl = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(f);
  });

function Avatar({ nome, cor }: { nome: string; cor: string }) {
  return (
    <div
      className="h-8 w-8 rounded-full text-white text-xs font-semibold flex items-center justify-center shrink-0"
      style={{ backgroundColor: cor }}
    >
      {nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
    </div>
  );
}

function ComentarioItem({ com, clienteId }: { com: Comentario; clienteId: string }) {
  const { responsaveis, posts, cards, updateComentario, deleteComentario } = useCRM();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(com.comentario_texto);

  const autor = responsaveis.find((r) => r.id === com.usuario_id);
  const post = com.post_id ? posts.find((p) => p.id === com.post_id) : undefined;
  const card = post ? cards.find((c) => c.id === post.card_id) : undefined;

  const salvar = () => {
    if (!texto.trim()) {
      toast.error("Comentário não pode ficar vazio");
      return;
    }
    updateComentario(com.id, { comentario_texto: texto.trim() });
    setEditando(false);
    toast.success("Comentário atualizado");
  };

  const cancelar = () => {
    setTexto(com.comentario_texto);
    setEditando(false);
  };

  return (
    <div className="group flex gap-3 p-3 rounded-md hover:bg-muted/40 transition-colors">
      <Avatar nome={autor?.nome ?? "U"} cor={autor?.cor ?? "hsl(var(--muted-foreground))"} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{autor?.nome ?? "Usuário"}</span>
          <span className="text-[11px] text-muted-foreground">
            {new Date(com.created_at).toLocaleString("pt-BR")}
          </span>
          {post && card ? (
            <Link
              to={`/clientes/${clienteId}/posts/${post.id}`}
              className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20"
              title="Abrir post"
            >
              Post: {card.titulo_card}
            </Link>
          ) : (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-accent text-accent-foreground">
              Direto
            </span>
          )}
        </div>

        {editando ? (
          <div className="mt-2 space-y-2">
            <Textarea
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancelar();
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) salvar();
              }}
              rows={3}
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={cancelar}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={salvar}>
                <Check className="h-3.5 w-3.5 mr-1" /> Salvar
              </Button>
            </div>
          </div>
        ) : (
          <>
            {com.comentario_texto && (
              <div className="text-sm mt-1 whitespace-pre-wrap break-words">{com.comentario_texto}</div>
            )}
            {com.imagem_url && (
              <a href={com.imagem_url} target="_blank" rel="noreferrer">
                <img src={com.imagem_url} alt="anexo" className="mt-2 max-h-48 rounded border" />
              </a>
            )}
          </>
        )}
      </div>

      {!editando && (
        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditando(true)} title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Excluir">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteComentario(com.id);
                    toast.success("Comentário excluído");
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

export function HistoricoComentariosDialog({ clienteId, open, onOpenChange }: Props) {
  const { clientes, comentarios, posts, cards, responsaveis, addComentario } = useCRM();
  const cliente = clientes.find((c) => c.id === clienteId);
  const [novo, setNovo] = useState("");
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const itens = useMemo(() => {
    if (!clienteId) return [];
    const cardIds = cards.filter((c) => c.cliente_id === clienteId).map((c) => c.id);
    const postIds = posts.filter((p) => cardIds.includes(p.card_id)).map((p) => p.id);
    return comentarios
      .filter((c) => c.cliente_id === clienteId || (c.post_id && postIds.includes(c.post_id)))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [clienteId, comentarios, posts, cards]);

  const onPickImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const dataUrl = await fileToDataUrl(f);
      setImagemUrl(dataUrl);
    } catch {
      toast.error("Falha ao carregar imagem");
    }
    e.target.value = "";
  };

  const enviar = () => {
    if ((!novo.trim() && !imagemUrl) || !clienteId) return;
    addComentario({
      cliente_id: clienteId,
      usuario_id: responsaveis[0]?.id ?? "user",
      comentario_texto: novo.trim(),
      imagem_url: imagemUrl ?? undefined,
    });
    setNovo("");
    setImagemUrl(null);
    toast.success("Comentário adicionado");
  };

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b">
          <DialogTitle className="text-base">
            Histórico de Comentários — <span className="text-primary">{cliente.nome_cliente}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {itens.length} {itens.length === 1 ? "comentário" : "comentários"}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] px-2 py-2">
          {itens.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground flex flex-col items-center gap-2">
              <MessageSquarePlus className="h-8 w-8 opacity-40" />
              <span>Nenhum comentário ainda. Seja o primeiro a comentar.</span>
            </div>
          ) : (
            <div className="space-y-1">
              {itens.map((c) => (
                <ComentarioItem key={c.id} com={c} clienteId={cliente.id} />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Composer estilo "Atividade" */}
        <div className="border-t p-3 bg-muted/20">
          <div className="rounded-xl border bg-background px-3 py-2 space-y-2">
            {imagemUrl && (
              <div className="relative inline-block">
                <img src={imagemUrl} className="max-h-32 rounded border" alt="preview" />
                <button
                  onClick={() => setImagemUrl(null)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  title="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <Textarea
              rows={1}
              placeholder="Escreva um comentário..."
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
              className="border-0 focus-visible:ring-0 resize-none bg-transparent min-h-[36px] p-0 shadow-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-muted-foreground">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickImg}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => fileRef.current?.click()}
                  title="Anexar imagem"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => fileRef.current?.click()}
                  title="Imagem"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Emoji" disabled>
                  <Smile className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Mencionar" disabled>
                  <AtSign className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  Enter envia · Shift+Enter quebra
                </span>
                <Button size="sm" onClick={enviar} disabled={!novo.trim() && !imagemUrl}>
                  <Send className="h-3.5 w-3.5 mr-1" /> Enviar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
