import { useParams, Link } from "react-router-dom";
import { useCRM, StatusCard } from "@/store/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { AvatarStack } from "@/components/AvatarStack";
import { Paperclip, Send, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

const STATUS: StatusCard[] = ["Criar", "Revisar", "Agendar", "Postado", "Renovação"];

export default function PostDetalhe() {
  const { postId } = useParams();
  const { posts, cards, comentarios, responsaveis, updatePost, addComentario } = useCRM();
  const post = posts.find((p) => p.id === postId);
  const card = post && cards.find((c) => c.id === post.card_id);

  const [texto, setTexto] = useState("");
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);

  if (!post || !card) return <div className="p-6 text-muted-foreground">Post não encontrado.</div>;

  const meusComentarios = comentarios.filter((c) => c.post_id === post.id).sort((a, b) => a.created_at.localeCompare(b.created_at));

  const enviar = () => {
    if (!texto.trim() && !imagemUrl) return;
    addComentario({
      post_id: post.id,
      usuario_id: responsaveis[0]?.id ?? "user",
      comentario_texto: texto,
      imagem_url: imagemUrl ?? undefined,
    });
    setTexto("");
    setImagemUrl(null);
    toast.success("Comentário adicionado");
  };

  const onPickImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setImagemUrl(URL.createObjectURL(f));
  };

  const addAnexo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    updatePost(post.id, { anexos: [...post.anexos, { id: crypto.randomUUID(), nome: f.name, url: URL.createObjectURL(f) }] });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4 animate-fade-in">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Input
                value={post.titulo_post}
                onChange={(e) => updatePost(post.id, { titulo_post: e.target.value })}
                className="text-xl font-bold border-0 px-0 focus-visible:ring-0 h-auto"
              />
              <div className="text-xs text-muted-foreground mt-1">Mês {card.mes_referencia} · Semana {card.numero_semana}</div>
            </div>
            <Select value={post.status} onValueChange={(v) => updatePost(post.id, { status: v as StatusCard })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Data agendamento</Label>
            <Input type="date" value={post.data_agendamento ?? ""} onChange={(e) => updatePost(post.id, { data_agendamento: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Data postagem</Label>
            <Input type="date" value={post.data_postagem ?? ""} onChange={(e) => updatePost(post.id, { data_postagem: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Link do Meta</Label>
            <Input placeholder="https://..." value={post.link_post ?? ""} onChange={(e) => updatePost(post.id, { link_post: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs">Responsáveis</Label>
            <div className="mt-1"><AvatarStack responsaveis={responsaveis.filter((r) => card.responsaveis.includes(r.id))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Anexos</CardTitle>
          <label className="cursor-pointer">
            <input type="file" className="hidden" onChange={addAnexo} />
            <Button size="sm" variant="outline" asChild><span><Paperclip className="h-4 w-4 mr-1" /> Adicionar anexo</span></Button>
          </label>
        </CardHeader>
        <CardContent>
          {post.anexos.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum anexo</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {post.anexos.map((a) => (
                <a key={a.id} href={a.url} target="_blank" className="border rounded-md p-2 text-xs hover:bg-accent flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{a.nome}</span>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Legenda</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            rows={5}
            placeholder="Escreva a legenda do post..."
            value={post.legenda}
            onChange={(e) => updatePost(post.id, { legenda: e.target.value })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Atividade</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 max-h-72 overflow-auto scrollbar-thin">
            {meusComentarios.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Sem comentários ainda</div>}
            {meusComentarios.map((c) => {
              const autor = responsaveis.find((r) => r.id === c.usuario_id);
              return (
                <div key={c.id} className="flex gap-2">
                  {autor && <div className="h-7 w-7 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0" style={{ backgroundColor: autor.cor }}>{autor.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div>}
                  <div className="flex-1 bg-muted/40 rounded-md px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">{autor?.nome ?? "Usuário"} · {new Date(c.created_at).toLocaleString("pt-BR")}</div>
                    <div className="text-sm">{c.comentario_texto}</div>
                    {c.imagem_url && <img src={c.imagem_url} className="mt-2 max-h-40 rounded" alt="anexo" />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border rounded-md p-2 space-y-2">
            <Textarea rows={2} placeholder="Comentar..." value={texto} onChange={(e) => setTexto(e.target.value)} className="border-0 focus-visible:ring-0 resize-none" />
            {imagemUrl && (
              <div className="relative inline-block">
                <img src={imagemUrl} className="max-h-24 rounded" alt="preview" />
                <button onClick={() => setImagemUrl(null)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <label className="cursor-pointer text-muted-foreground hover:text-foreground">
                <input type="file" accept="image/*" className="hidden" onChange={onPickImg} />
                <ImageIcon className="h-4 w-4" />
              </label>
              <Button size="sm" onClick={enviar}><Send className="h-4 w-4 mr-1" /> Enviar</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
