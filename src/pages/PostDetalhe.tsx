import { useParams, useNavigate } from "react-router-dom";
import { useCRM } from "@/store/crm";
import { PostDetalheDialog } from "@/components/clientes/PostDetalheDialog";

export default function PostDetalhe() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { posts, cards } = useCRM();
  const post = posts.find((p) => p.id === postId);
  const card = post && cards.find((c) => c.id === post.card_id);

  const voltarParaVisaoGeral = () => {
    if (card?.cliente_id) {
      navigate(`/clientes/${card.cliente_id}?tab=posts`);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/clientes");
    }
  };

  if (!postId || !post || !card) {
    return <div className="p-6 text-muted-foreground">Post não encontrado.</div>;
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <PostDetalheDialog postId={postId} onVoltar={voltarParaVisaoGeral} />
    </div>
  );
}
