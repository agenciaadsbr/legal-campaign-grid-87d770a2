import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, StickyNote } from "lucide-react";
import { useProjectNotes } from "@/store/projectNotes";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface ProjectNotesButtonProps {
  onClick: () => void;
  clientId: string;
  className?: string;
}

export function ProjectNotesButton({ onClick, clientId, className }: ProjectNotesButtonProps) {
  const { notes, fetchNotes, loading } = useProjectNotes();

  useEffect(() => {
    if (clientId) {
      fetchNotes(clientId);
    }
  }, [clientId, fetchNotes]);

  const count = notes.length;

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onClick}
      className={cn("h-8 gap-2 border-dashed bg-primary/5 hover:bg-primary/10 transition-all group", className)}
    >
      <StickyNote className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
      <span className="text-xs font-semibold">Observações</span>
      {count > 0 && (
        <Badge variant="default" className="h-4 min-w-[16px] px-1 text-[10px] flex items-center justify-center rounded-full bg-primary animate-in zoom-in duration-300">
          {count}
        </Badge>
      )}
    </Button>
  );
}
