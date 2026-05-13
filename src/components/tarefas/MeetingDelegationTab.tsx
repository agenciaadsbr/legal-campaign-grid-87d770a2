import { useState, useMemo, useEffect } from "react";
import { useCRM } from "@/store/crm";
import { useDelegations, useDelegationsBootstrap, MeetingDelegation } from "@/store/delegations";
import { useReunioes, useReunioesBootstrap } from "@/store/reunioes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Search, 
  Calendar, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  Eye
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReuniaoDialog } from "@/components/projeto/ReuniaoDialog";

export function MeetingDelegationTab() {
  useDelegationsBootstrap();
  useReunioesBootstrap();
  const { delegations, updateDelegation } = useDelegations();
  const { reunioes } = useReunioes();
  const { clientes, responsaveis } = useCRM();
  
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredDelegations = useMemo(() => {
    return delegations.filter(d => {
      const reuniao = reunioes.find(r => r.id === d.reuniao_id);
      const cliente = clientes.find(c => c.id === d.cliente_id);
      
      if (!reuniao || !cliente) return false;
      
      if (filtroStatus !== "all" && d.status !== filtroStatus) return false;
      
      if (busca) {
        const q = busca.toLowerCase();
        return (
          reuniao.titulo.toLowerCase().includes(q) ||
          cliente.nome_cliente.toLowerCase().includes(q)
        );
      }
      
      return true;
    });
  }, [delegations, reunioes, clientes, busca, filtroStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Aguardando delegação": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Em análise": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Delegado": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Concluído": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const handleOpenReuniao = (reuniaoId: string) => {
    const r = reunioes.find(x => x.id === reuniaoId);
    if (r) {
      setSelectedMeeting(r);
      setDialogOpen(true);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await updateDelegation(id, { status: newStatus });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar por cliente ou reunião..." 
            className="pl-9 h-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="Aguardando delegação">Aguardando delegação</SelectItem>
            <SelectItem value="Em análise">Em análise</SelectItem>
            <SelectItem value="Delegado">Delegado</SelectItem>
            <SelectItem value="Concluído">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredDelegations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum alerta de delegação encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredDelegations.map((d) => {
            const reuniao = reunioes.find(r => r.id === d.reuniao_id);
            const cliente = clientes.find(c => c.id === d.cliente_id);
            const resp = responsaveis.find(r => r.id === d.responsavel_id);
            
            if (!reuniao || !cliente) return null;

            return (
              <Card key={d.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={getStatusColor(d.status)}>
                          {d.status}
                        </Badge>
                        <span className="text-xs font-bold text-primary uppercase">{cliente.nome_cliente}</span>
                      </div>
                      <h3 className="font-semibold text-base line-clamp-1">{reuniao.titulo}</h3>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(reuniao.data), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Responsável: <span className="font-medium text-foreground">{resp?.nome || "Não atribuído"}</span>
                        </span>
                        {d.prazo && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Prazo: <span className="font-medium text-foreground">{format(parseISO(d.prazo), "dd/MM/yy")}</span>
                          </span>
                        )}
                      </div>

                      {d.observacoes && (
                        <p className="mt-3 text-xs bg-muted/40 p-2 rounded border-l-2 border-primary/30 italic">
                          "{d.observacoes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Select value={d.status} onValueChange={(v) => handleUpdateStatus(d.id, v)}>
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aguardando delegação">Aguardando delegação</SelectItem>
                          <SelectItem value="Em análise">Em análise</SelectItem>
                          <SelectItem value="Delegado">Delegado</SelectItem>
                          <SelectItem value="Concluído">Concluído</SelectItem>
                          <SelectItem value="Cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 text-xs"
                        onClick={() => handleOpenReuniao(d.reuniao_id)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Ver Reunião
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedMeeting && (
        <ReuniaoDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen} 
          clienteId={selectedMeeting.cliente_id} 
          reuniao={selectedMeeting} 
        />
      )}
    </div>
  );
}
