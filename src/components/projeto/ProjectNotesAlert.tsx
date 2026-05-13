import { useProjectNotes } from "@/store/projectNotes";
import { AlertTriangle, ChevronRight, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProjectNotesAlertProps {
  onClick: () => void;
  className?: string;
}

export function ProjectNotesAlert({ onClick, className }: ProjectNotesAlertProps) {
  const { notes } = useProjectNotes();
  
  const pinnedNotes = notes.filter(n => n.pinned);
  
  if (pinnedNotes.length === 0) return null;

  const firstPinned = pinnedNotes[0];
  const othersCount = pinnedNotes.length - 1;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-all animate-in fade-in slide-in-from-top duration-500",
        className
      )}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 flex items-center gap-1">
              <Pin className="h-2.5 w-2.5 fill-red-600" /> Observação Importante
            </span>
            {othersCount > 0 && (
              <span className="text-[10px] bg-red-200 text-red-700 px-1.5 rounded-full font-bold">
                +{othersCount}
              </span>
            )}
          </div>
          <p className="text-xs font-medium truncate">
            {firstPinned.title}: <span className="text-muted-foreground font-normal">{firstPinned.description?.slice(0, 100)}...</span>
          </p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-red-600 shrink-0 ml-4" />
    </div>
  );
}
