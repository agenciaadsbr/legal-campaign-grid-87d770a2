import { useCRM } from "@/store/crm";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { StatusClienteBadge } from "@/components/StatusClienteBadge";

export default function Contratos() {
  const { contratos, clientes } = useCRM();
  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Contratos</h1>
        <p className="text-sm text-muted-foreground">{contratos.length} contratos ativos</p>
      </div>
      <div className="border rounded-lg bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground">Cliente</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground w-72">Progresso</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground">Início</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase text-muted-foreground">Fim</th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((ct) => {
              const cli = clientes.find((c) => c.id === ct.cliente_id);
              const opt = statusOptions.find((s) => s.label === cli?.status_cliente);
              const pct = (ct.posts_concluidos / ct.total_posts) * 100;
              return (
                <tr key={ct.id} className="border-t hover:bg-accent/30">
                  <td className="px-4 py-2.5"><Link to={`/clientes/${ct.cliente_id}`} className="text-primary font-medium hover:underline">{cli?.nome_cliente}</Link></td>
                  <td className="px-4 py-2.5">{opt && <ColorBadge label={opt.label} color={opt.cor} />}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground tabular-nums">{ct.posts_concluidos}/{ct.total_posts}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(ct.data_inicio).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(ct.data_fim).toLocaleDateString("pt-BR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
