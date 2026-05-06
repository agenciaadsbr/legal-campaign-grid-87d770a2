import { useState } from "react";
import { MoreVertical, Pencil, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface AulaCardData {
  id: string;
  titulo: string;
  descricao: string | null;
  thumbnail_url: string | null;
}

interface Props {
  aula: AulaCardData;
  isAdmin: boolean;
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function AulaCard({ aula, isAdmin, onPlay, onEdit, onDelete }: Props) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="group relative rounded-lg border border-border bg-card text-card-foreground shadow-sm overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={onPlay}
        className="block w-full text-left"
        aria-label={`Assistir aula: ${aula.titulo}`}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-background">
          {aula.thumbnail_url ? (
            <img
              src={aula.thumbnail_url}
              alt={aula.titulo}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-foreground/30 text-5xl font-bold tracking-wider">AULA</div>
            </div>
          )}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px] transition-opacity",
              hover ? "opacity-100" : "opacity-80"
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/80 border border-border shadow-lg">
              <Play className="h-6 w-6 text-foreground fill-foreground ml-0.5" />
            </div>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-foreground line-clamp-1">{aula.titulo}</h3>
          {aula.descricao && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{aula.descricao}</p>
          )}
        </div>
      </button>

      {isAdmin && (
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-background/80 hover:bg-background"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
