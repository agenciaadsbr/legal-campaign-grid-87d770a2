import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getEmbedUrl, TipoVideo } from "@/lib/aulas-video";
import { Download } from "lucide-react";

interface Aula {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo_video: string;
  video_url: string;
  anexo_url: string | null;
  anexo_nome: string | null;
}

interface Props {
  aula: Aula | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AulaPlayerDialog({ aula, open, onOpenChange }: Props) {
  if (!aula) return null;
  const tipo = aula.tipo_video as TipoVideo;
  const embed = getEmbedUrl(tipo, aula.video_url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-4 md:p-5 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{aula.titulo}</DialogTitle>
          {aula.descricao && (
            <DialogDescription className="text-left">{aula.descricao}</DialogDescription>
          )}
        </DialogHeader>

        <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden border border-border">
          {tipo === "upload" ? (
            <video
              src={aula.video_url}
              controls
              className="absolute inset-0 h-full w-full"
              preload="metadata"
            />
          ) : embed ? (
            <iframe
              src={embed}
              title={aula.titulo}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              URL de vídeo inválida.
            </div>
          )}
        </div>

        {aula.anexo_url && (
          <a
            href={aula.anexo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Download className="h-4 w-4" />
            {aula.anexo_nome || "Baixar anexo"}
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
