import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskFormBase } from "@/components/tarefas/TaskFormBase";
import { useCRM } from "@/store/crm";
import { useDemandasStore } from "@/store/demandas";
import { toast } from "sonner";

export default function CriarTarefa() {
  const navigate = useNavigate();
  const { clientes } = useCRM();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold">Criar Nova Tarefa</h1>
        <p className="text-sm text-muted-foreground">Entrada rápida para criação de tarefas em qualquer área.</p>
      </header>

      <Card>
        <CardContent className="p-6">
          <TaskFormBase 
            onSuccess={(tipo, clienteId, refId) => {
              toast.success("Tarefa criada com sucesso!");
              if (tipo === 'post') {
                navigate(`/clientes/${clienteId}/posts/${refId}`);
              } else {
                navigate(`/clientes/${clienteId}/projeto?tab=projeto&demanda=${refId}`);
              }
            }}
            onCancel={() => navigate(-1)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
