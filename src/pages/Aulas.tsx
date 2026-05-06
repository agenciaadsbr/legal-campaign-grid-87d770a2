import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AulaCard } from "@/components/aulas/AulaCard";
import { AulaFormDialog, AulaEditData } from "@/components/aulas/AulaFormDialog";
import { AulaPlayerDialog } from "@/components/aulas/AulaPlayerDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Aula {
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

const SEM_CATEGORIA = "Outros";

export default function Aulas() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAula, setEditingAula] = useState<AulaEditData | null>(null);
  const [playingAula, setPlayingAula] = useState<Aula | null>(null);
  const [deleting, setDeleting] = useState<Aula | null>(null);

  const { data: aulas = [], isLoading } = useQuery({
    queryKey: ["aulas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .order("categoria", { ascending: true })
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Aula[];
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Aula[]>();
    for (const a of aulas) {
      const key = a.categoria?.trim() || SEM_CATEGORIA;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries());
  }, [aulas]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("aulas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aula excluída");
      qc.invalidateQueries({ queryKey: ["aulas"] });
      setDeleting(null);
    },
    onError: (e: any) => toast.error("Erro ao excluir", { description: e.message }),
  });

  const openNew = () => {
    setEditingAula(null);
    setFormOpen(true);
  };

  const openEdit = (a: Aula) => {
    setEditingAula(a);
    setFormOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aulas sobre a Plataforma</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capacite-se com nossos treinamentos exclusivos.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Aula
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando aulas...</div>
      ) : aulas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-semibold text-foreground">Nenhuma aula cadastrada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? 'Clique em "Nova Aula" para começar a cadastrar treinamentos.'
              : "As aulas aparecerão aqui assim que forem cadastradas."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([categoria, lista]) => (
            <section key={categoria} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">{categoria}</h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lista.map((a) => (
                  <AulaCard
                    key={a.id}
                    aula={a}
                    isAdmin={isAdmin}
                    onPlay={() => setPlayingAula(a)}
                    onEdit={() => openEdit(a)}
                    onDelete={() => setDeleting(a)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AulaFormDialog open={formOpen} onOpenChange={setFormOpen} aula={editingAula} />
      <AulaPlayerDialog
        aula={playingAula}
        open={!!playingAula}
        onOpenChange={(o) => !o && setPlayingAula(null)}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aula?</AlertDialogTitle>
            <AlertDialogDescription>
              A aula <strong>{deleting?.titulo}</strong> será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
