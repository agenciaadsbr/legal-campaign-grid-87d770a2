import { useParams, useNavigate } from "react-router-dom";
import { useCRM } from "@/store/crm";
import { Card, CardContent } from "@/components/ui/card";
import { TaskFormBase } from "@/components/tarefas/TaskFormBase";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { VoltarVisaoGeralButton } from "@/components/projeto/VoltarVisaoGeralButton";

export default function PostDetalhe() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { posts, cards } = useCRM();
  const { canWrite } = useAuth();
  const post = posts.find((p) => p.id === postId);
  const card = post && cards.find((c) => c.id === post.card_id);

  const [loading, setLoading] = useState(false);
  const taskFormRef = useRef<{ handleSubmit: () => Promise<void> } | null>(null);

  const handleSubmit = async () => {
    if (taskFormRef.current) {
      setLoading(true);
      await taskFormRef.current.handleSubmit();
      setLoading(false);
    }
  };

  const voltarParaVisaoGeral = () => {
    if (card?.cliente_id) {
      navigate(`/clientes/${card.cliente_id}?tab=posts`);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/clientes");
    }
  };

  if (!post || !card) return <div className="p-6 text-muted-foreground">Post não encontrado.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-3 animate-fade-in">
      <VoltarVisaoGeralButton onClick={voltarParaVisaoGeral} />
      
      <Card>
        <CardContent className="p-6">
          <TaskFormBase 
            ref={taskFormRef}
            initialPostId={postId}
            onSuccess={() => toast.success("Post atualizado")}
            onCancel={voltarParaVisaoGeral}
            standalone={false}
          />
          
          {canWrite && (
            <div className="mt-6 pt-6 border-t">
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="w-full md:w-auto"
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
