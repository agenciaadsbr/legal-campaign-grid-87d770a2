import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useCRM } from "@/store/crm";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { AtivacaoLinha } from "@/hooks/useOnboardingProgress";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  linha: AtivacaoLinha | null;
  onAtivado?: () => void;
}

export function MarcarAtivoDialog({ open, onOpenChange, linha, onAtivado }: Props) {
  const updateCliente = useCRM((s) => s.updateCliente);
  const addAtividade = useCRM((s) => s.addAtividade);
  const { roles, user } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const [saving, setSaving] = useState(false);

  if (!linha) return null;

  const temPendencia = linha.pendenciasCriticas.length > 0 || linha.pendenciasRegra.length > 0;

  const ativar = async (forcar: boolean) => {
    setSaving(true);
    try {
      await updateCliente(linha.cliente.id, {
        status_global: "Ativo",
        data_ativacao: new Date().toISOString(),
      } as any);
      await addAtividade({
        clienteId: linha.cliente.id,
        acao: "ativacao",
        descricao: forcar
          ? "Cliente marcado como Ativo manualmente (mesmo com pendências críticas)"
          : "Cliente marcado como Ativo via Central de Ativação",
        tipo: "Gerencial",
        payload: { forcar, pendencias: linha.pendenciasCriticas, regras_pendentes: linha.pendenciasRegra, user_id: user?.id },
      });
      toast.success(`${linha.cliente.nome_cliente} marcado como Ativo`);
      onOpenChange(false);
      onAtivado?.();
    } catch (e: any) {
      toast.error("Falha ao marcar como Ativo: " + (e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Marcar {linha.cliente.nome_cliente} como Ativo
          </DialogTitle>
          <DialogDescription>
            Validação automática contra as regras de ativação e pendências do onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {linha.atendidasRegra.length > 0 && (
            <div>
              <div className="font-medium text-foreground mb-1">Condições atendidas</div>
              <ul className="space-y-1">
                {linha.atendidasRegra.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {linha.pendenciasRegra.length > 0 && (
            <div>
              <div className="font-medium text-foreground mb-1">Condições da regra ainda pendentes</div>
              <ul className="space-y-1">
                {linha.pendenciasRegra.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {linha.pendenciasCriticas.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <div className="flex items-center gap-2 font-medium text-destructive mb-1">
                <AlertTriangle className="h-4 w-4" />
                Pendências críticas
              </div>
              <ul className="space-y-1 text-sm text-destructive">
                {linha.pendenciasCriticas.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Este cliente ainda possui pendências críticas. Revise os itens antes de marcar como Ativo.
              </p>
            </div>
          )}

          {!temPendencia && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
              Nenhuma pendência crítica detectada. Cliente pronto para ser ativado.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {temPendencia && isAdmin && (
            <Button variant="destructive" onClick={() => ativar(true)} disabled={saving}>
              Marcar mesmo assim
            </Button>
          )}
          <Button onClick={() => ativar(false)} disabled={saving || (temPendencia && !isAdmin)}>
            {saving ? "Ativando..." : "Marcar como Ativo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
