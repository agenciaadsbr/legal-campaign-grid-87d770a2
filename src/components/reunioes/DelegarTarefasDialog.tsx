import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import { useCRM } from "@/store/crm";
import { useReunioes } from "@/store/reunioes";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  meetingId: string;
  clientId: string;
  projectId?: string | null;
}

function toLocalDateTimeInput(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DelegarTarefasDialog({ open, onOpenChange, meetingId }: Props) {
  const responsaveis = useCRM((s) => s.responsaveis);
  const confirmarDelegacao = useReunioes((s) => s.confirmarDelegacao);
  const reuniao = useReunioes((s) => s.reunioes.find((r) => r.id === meetingId));

  const [status, setStatus] = useState<"delegada" | "nao_delegada">("delegada");
  const [acaoNaoDelegada, setAcaoNaoDelegada] = useState<"manter" | "sem_acao">("manter");
  const [responsavel, setResponsavel] = useState<string>("");
  const [dataDelegacao, setDataDelegacao] = useState<string>(toLocalDateTimeInput());
  const [qtd, setQtd] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(reuniao?.post_status === "delegada" ? "delegada" : "delegada");
      setAcaoNaoDelegada("manter");
      setResponsavel(reuniao?.responsavel_delegacao_id ?? "");
      setDataDelegacao(toLocalDateTimeInput(reuniao?.delegada_em ?? null));
      setQtd(
        reuniao?.qtd_tarefas_delegadas != null ? String(reuniao.qtd_tarefas_delegadas) : ""
      );
    }
  }, [open, meetingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await confirmarDelegacao(meetingId, {
        status,
        acao_nao_delegada: acaoNaoDelegada,
        responsavel_delegacao_id: responsavel || null,
        delegada_em: dataDelegacao ? new Date(dataDelegacao).toISOString() : null,
        prazo_delegacao: null,
        qtd_tarefas_delegadas: qtd.trim() ? Number(qtd) : null,
        observacoes_delegacao: null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Confirmar delegação da reunião
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Status da delegação</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="delegada">Delegada</SelectItem>
                <SelectItem value="nao_delegada">Não delegada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "nao_delegada" && (
            <div>
              <Label className="text-xs">Ação pós-reunião</Label>
              <Select value={acaoNaoDelegada} onValueChange={(v) => setAcaoNaoDelegada(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manter">Manter pós-reunião atual</SelectItem>
                  <SelectItem value="sem_acao">Marcar como "Sem ação necessária"</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Responsável pela delegação</Label>
              <Select
                value={responsavel || "__none__"}
                onValueChange={(v) => setResponsavel(v === "__none__" ? "" : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {responsaveis.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Data da delegação</Label>
              <Input
                type="datetime-local"
                value={dataDelegacao}
                onChange={(e) => setDataDelegacao(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Quantidade de tarefas delegadas (opcional)</Label>
              <Input
                type="number"
                min={0}
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
                placeholder="Ex: 4"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? "Salvando..." : "Confirmar delegação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
