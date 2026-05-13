import { useState, useMemo, useEffect } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Pin, 
  Archive, 
  Trash2, 
  Pencil, 
  Search, 
  Filter, 
  ChevronRight,
  AlertTriangle,
  Info
} from "lucide-react";
import { useProjectNotes, ProjectNote } from "@/store/projectNotes";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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

const CATEGORIES = [
  "Identidade Visual",
  "Atendimento",
  "Aprovação",
  "Tráfego Pago",
  "Posts",
  "Vídeos",
  "Landing Page",
  "CRM / IA",
  "Cliente",
  "Estratégia",
  "Operacional",
  "Geral",
];

const PRIORITIES = [
  { label: "Baixa", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { label: "Média", color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400" },
  { label: "Alta", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { label: "Crítica", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

interface ProjectNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function ProjectNotesModal({ open, onOpenChange, clientId }: ProjectNotesModalProps) {
  const { notes, addNote, updateNote, deleteNote, loading } = useProjectNotes();
  const { canWrite, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("Todas");
  const [filterPinned, setFilterPinned] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Geral",
    priority: "Média",
    pinned: false
  });

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (note.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesCategory = filterCategory === "Todas" || note.category === filterCategory;
      const matchesPinned = !filterPinned || note.pinned;
      return matchesSearch && matchesCategory && matchesPinned;
    });
  }, [notes, searchTerm, filterCategory, filterPinned]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "Geral",
      priority: "Média",
      pinned: false
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    if (editingId) {
      await updateNote(editingId, formData);
    } else {
      await addNote({ ...formData, client_id: clientId });
    }
    resetForm();
  };

  const handleEdit = (note: ProjectNote) => {
    setFormData({
      title: note.title,
      description: note.description || "",
      category: note.category,
      priority: note.priority,
      pinned: note.pinned
    });
    setEditingId(note.id);
    setIsAdding(true);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full flex flex-col h-full overflow-hidden p-0">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-bold">Observações Gerais</SheetTitle>
              <SheetDescription>Regras e orientações importantes do cliente</SheetDescription>
            </div>
            {canWrite && !isAdding && (
              <Button onClick={() => setIsAdding(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Nova
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isAdding ? (
            <div className="p-6 space-y-4 animate-in slide-in-from-right duration-200">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título Curto</Label>
                  <Input 
                    placeholder="Ex: Identidade Visual" 
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição Detalhada</Label>
                  <Textarea 
                    placeholder="Descreva a regra ou observação..." 
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select 
                      value={formData.category}
                      onValueChange={v => setFormData(prev => ({ ...prev, category: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select 
                      value={formData.priority}
                      onValueChange={v => setFormData(prev => ({ ...prev, priority: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map(p => (
                          <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="pinned"
                    checked={formData.pinned}
                    onChange={e => setFormData(prev => ({ ...prev, pinned: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="pinned" className="text-sm font-medium leading-none cursor-pointer">
                    Fixar no topo e exibir alerta visual
                  </Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingId ? "Atualizar" : "Criar Observação"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 bg-muted/30 border-b space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar observações..." 
                    className="pl-9 h-9"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <Button 
                    variant={filterCategory === "Todas" ? "default" : "outline"} 
                    size="sm" 
                    className="h-7 text-[10px] px-2"
                    onClick={() => setFilterCategory("Todas")}
                  >
                    Todas
                  </Button>
                  <Button 
                    variant={filterPinned ? "default" : "outline"} 
                    size="sm" 
                    className="h-7 text-[10px] px-2 gap-1"
                    onClick={() => setFilterPinned(!filterPinned)}
                  >
                    <Pin className="h-3 w-3" /> Fixadas
                  </Button>
                  {CATEGORIES.slice(0, 6).map(cat => (
                    <Button 
                      key={cat}
                      variant={filterCategory === cat ? "default" : "outline"} 
                      size="sm" 
                      className="h-7 text-[10px] px-2"
                      onClick={() => setFilterCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredNotes.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <Info className="h-10 w-10 text-muted-foreground mx-auto opacity-20" />
                    <p className="text-sm text-muted-foreground">Nenhuma observação encontrada.</p>
                  </div>
                ) : (
                  filteredNotes.map(note => (
                    <Card key={note.id} className={cn(
                      "group border-l-4 transition-all hover:shadow-md",
                      note.pinned ? "border-l-primary bg-primary/5" : "border-l-transparent"
                    )}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase font-bold tracking-wider">
                                {note.category}
                              </Badge>
                              <Badge 
                                className={cn(
                                  "text-[10px] h-5 px-1.5 border-none",
                                  PRIORITIES.find(p => p.label === note.priority)?.color || "bg-slate-100 text-slate-700"
                                )}
                              >
                                {note.priority}
                              </Badge>
                              {note.pinned && <Pin className="h-3 w-3 text-primary fill-primary" />}
                            </div>
                            <h4 className="font-bold text-sm leading-tight">{note.title}</h4>
                          </div>
                          {canWrite && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(note)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Archive className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Arquivar Observação?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta observação não será mais visível na lista ativa. Você poderá recuperá-la no banco de dados se necessário.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => updateNote(note.id, { archived: true })}>
                                      Arquivar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {note.description}
                        </p>

                        <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-dashed">
                          <span>
                            {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const Label = ({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wider", className)} {...props}>
    {children}
  </label>
);
