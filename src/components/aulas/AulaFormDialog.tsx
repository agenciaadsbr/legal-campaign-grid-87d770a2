import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TIPO_VIDEO_OPTIONS, TipoVideo } from "@/lib/aulas-video";
import { toast } from "sonner";

export interface AulaEditData {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo_video: string;
  video_url: string;
  categoria: string | null;
  ordem: number | null;
  thumbnail_url: string | null;
  anexo_url: string | null;
  anexo_nome: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aula?: AulaEditData | null;
}

const BUCKET = "aulas-assets";

export function AulaFormDialog({ open, onOpenChange, aula }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isEdit = !!aula?.id;

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoVideo, setTipoVideo] = useState<TipoVideo>("youtube");
  const [categoria, setCategoria] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [ordem, setOrdem] = useState<string>("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [anexoUrl, setAnexoUrl] = useState("");
  const [anexoNome, setAnexoNome] = useState("");

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);

  useEffect(() => {
    if (open) {
      setTitulo(aula?.titulo ?? "");
      setDescricao(aula?.descricao ?? "");
      setTipoVideo((aula?.tipo_video as TipoVideo) ?? "youtube");
      setCategoria(aula?.categoria ?? "");
      setVideoUrl(aula?.video_url ?? "");
      setOrdem(aula?.ordem != null ? String(aula.ordem) : "");
      setThumbnailUrl(aula?.thumbnail_url ?? "");
      setAnexoUrl(aula?.anexo_url ?? "");
      setAnexoNome(aula?.anexo_nome ?? "");
    }
  }, [open, aula]);

  const uploadFile = async (file: File, prefix: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleVideoUpload = async (file: File) => {
    try {
      setUploadingVideo(true);
      const url = await uploadFile(file, "videos");
      setVideoUrl(url);
      toast.success("Vídeo enviado");
    } catch (e: any) {
      toast.error("Falha ao enviar vídeo", { description: e.message });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleThumbUpload = async (file: File) => {
    try {
      setUploadingThumb(true);
      const url = await uploadFile(file, "thumbnails");
      setThumbnailUrl(url);
      toast.success("Thumbnail enviada");
    } catch (e: any) {
      toast.error("Falha ao enviar thumbnail", { description: e.message });
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleAnexoUpload = async (file: File) => {
    try {
      setUploadingAnexo(true);
      const url = await uploadFile(file, "anexos");
      setAnexoUrl(url);
      if (!anexoNome) setAnexoNome(file.name);
      toast.success("Anexo enviado");
    } catch (e: any) {
      toast.error("Falha ao enviar anexo", { description: e.message });
    } finally {
      setUploadingAnexo(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!titulo.trim()) throw new Error("Informe o título");
      if (!videoUrl.trim()) throw new Error("Informe a URL ou faça upload do vídeo");

      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        tipo_video: tipoVideo,
        video_url: videoUrl.trim(),
        categoria: categoria.trim() || null,
        ordem: ordem ? Number(ordem) : 0,
        thumbnail_url: thumbnailUrl.trim() || null,
        anexo_url: anexoUrl.trim() || null,
        anexo_nome: anexoNome.trim() || null,
      };

      const sb = supabase as any;
      if (isEdit && aula) {
        const { error } = await sb.from("aulas").update(payload).eq("id", aula.id);
        if (error) throw error;
      } else {
        const { error } = await sb
          .from("aulas")
          .insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Aula atualizada" : "Aula criada");
      qc.invalidateQueries({ queryKey: ["aulas"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const placeholderVideo: Record<TipoVideo, string> = {
    youtube: "https://www.youtube.com/watch?v=...",
    drive: "https://drive.google.com/file/d/.../view",
    upload: "Faça o upload do vídeo abaixo",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-4 md:p-5">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Aula" : "Nova Aula"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título da Aula *</Label>
            <Input
              id="titulo"
              placeholder="Ex: Introdução ao Marketing Jurídico"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva o conteúdo da aula"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de Vídeo</Label>
              <Select value={tipoVideo} onValueChange={(v) => setTipoVideo(v as TipoVideo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_VIDEO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                placeholder="Ex: Marketing, Jurídico"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="video_url">
              {tipoVideo === "upload" ? "Vídeo *" : "URL do Vídeo *"}
            </Label>
            {tipoVideo === "upload" ? (
              <div className="flex items-center gap-2">
                <Input
                  id="video_url"
                  value={videoUrl}
                  readOnly
                  placeholder="Nenhum vídeo enviado"
                />
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleVideoUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <Button asChild variant="outline" size="icon" disabled={uploadingVideo}>
                    <span>
                      {uploadingVideo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            ) : (
              <Input
                id="video_url"
                placeholder={placeholderVideo[tipoVideo]}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ordem">Ordem (opcional)</Label>
            <Input
              id="ordem"
              type="number"
              placeholder="1, 2, 3..."
              value={ordem}
              onChange={(e) => setOrdem(e.target.value)}
              className="md:max-w-[160px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="thumb">Thumbnail da Aula</Label>
            <div className="flex items-center gap-2">
              <Input
                id="thumb"
                placeholder="URL da imagem ou faça upload"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
              />
              <label className="inline-flex">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleThumbUpload(f);
                    e.target.value = "";
                  }}
                />
                <Button asChild variant="outline" size="icon" disabled={uploadingThumb}>
                  <span>
                    {uploadingThumb ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="anexo">Anexo (opcional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="anexo"
                placeholder="Nome do anexo"
                value={anexoNome}
                onChange={(e) => setAnexoNome(e.target.value)}
              />
              <label className="inline-flex">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAnexoUpload(f);
                    e.target.value = "";
                  }}
                />
                <Button asChild variant="outline" size="icon" disabled={uploadingAnexo}>
                  <span>
                    {uploadingAnexo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar" : "Criar Aula"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
