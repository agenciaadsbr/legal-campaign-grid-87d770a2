import { useMemo, useState } from "react";
import {
  Demanda,
  ProcessStepType,
  useDemandas,
} from "@/store/demandas";
import { useCRM } from "@/store/crm";
import { useAuth } from "@/hooks/useAuth";
import {
  CATEGORIA_LABEL,
  CATEGORIAS,
  CATEGORIA_SUBTIPOS,
  DemandaCategoria,
} from "@/lib/demandas-categorias";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Lock,
  Loader2,
  ListChecks,
  Plus,
  Trash2,
  ArrowRight,
  PlayCircle,
  Hourglass,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { DemandaDetalheDialog } from "@/components/demandas/DemandaDetalheDialog";

interface Props {
  cardPai: Demanda;
}

const STEP_TYPE_OPTIONS: { value: ProcessStepType; label: string; hint: string }[] = [
  { value: "tarefa", label: "Tarefa real", hint: "Cria card real na aba destino e na Central de Tarefas" },
  { value: "status", label: "Status (checkpoint)", hint: "Etapa lógica/visual sem card de trabalho" },
];

function statusIcon(etapa: Demanda) {
  if (etapa.status === "Concluido" || etapa.status === "Entregue" || etapa.process_step_status === "concluida") {
    return <CheckCircle2 className="h-4 w-4 text-green-500" aria-label="Concluída" />;
  }
  if (etapa.status === "Atrasado" || etapa.process_step_status === "atrasada") {
    return <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Atrasada" />;
  }
  if (etapa.process_step_status === "bloqueada") {
    return <Lock className="h-4 w-4 text-muted-foreground" aria-label="Bloqueada" />;
  }
  if (etapa.process_step_status === "em_execucao" || etapa.status === "Criar") {
    return <PlayCircle className="h-4 w-4 text-blue-500" aria-label="Em execução" />;
  }
  return <Hourglass className="h-4 w-4 text-amber-500" aria-label="Pendente" />;
}

export function EtapasProcesso({ cardPai }: Props) {
  const { canWrite } = useAuth();
  const { responsaveis } = useCRM();
  const demandas = useDemandas((s) => s.demandas);
  const createDemanda = useDemandas((s) => s.createDemanda);
  const updateDemanda = useDemandas((s) => s.updateDemanda);
  const deleteDemanda = useDemandas((s) => s.deleteDemanda);

  const etapas = useMemo(
    () =>
      demandas
        .filter((d) => d.parent_process_id === cardPai.id)
        .sort(
          (a, b) =>
            (a.process_step_order ?? 0) - (b.process_step_order ?? 0) ||
            a.created_at.localeCompare(b.created_at),
        ),
    [demandas, cardPai.id],
  );

  const [openEtapaId, setOpenEtapaId] = useState<string | null>(null);
  const etapaAberta = openEtapaId ? demandas.find((d) => d.id === openEtapaId) ?? null : null;

  // Form de nova etapa
  const [adicionando, setAdicionando] = useState(false);
  const [novoTipo, setNovoTipo] = useState<ProcessStepType>("tarefa");
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<DemandaCategoria>("Operacional");
  const [novoSubtipo, setNovoSubtipo] = useState<string>("");
  const [novoResp, setNovoResp] = useState<string>("");
  const [novoDepende, setNovoDepende] = useState<string>("");
  const [bloquear, setBloquear] = useState(true);
  const [reaprovBriefing, setReaprovBriefing] = useState(false);
  const [reaprovAnexos, setReaprovAnexos] = useState(false);
  const [reaprovResp, setReaprovResp] = useState(false);
  const [novoStatusLabel, setNovoStatusLabel] = useState("Aguardando aprovação do cliente");

  const subtipos = CATEGORIA_SUBTIPOS[novaCategoria] ?? [];

  const respLabel = (id: string | null | undefined) =>
    id ? responsaveis.find((r) => r.id === id)?.nome ?? "—" : "—";

  const handleAdicionar = async () => {
    const titulo = novoTitulo.trim() || (novoTipo === "status" ? novoStatusLabel : "");
    if (!titulo) {
      toast.error("Informe o título da etapa");
      return;
    }
    setAdicionando(true);
    try {
      const ordem = (etapas[etapas.length - 1]?.process_step_order ?? -1) + 1;
      const dependePai =
        novoDepende ||
        (etapas.length > 0 ? etapas[etapas.length - 1].id : null);
      const bloqueada = !!dependePai && bloquear;

      let respsHerdados: string[] = [];
      if (novoTipo === "tarefa") {
        if (reaprovResp) respsHerdados = cardPai.responsaveis_ids ?? [];
        else if (novoResp) respsHerdados = [novoResp];
      }

      const descricaoHerdada =
        reaprovBriefing && novoTipo === "tarefa" ? cardPai.descricao ?? null : null;

      const id = await createDemanda({
        cliente_id: cardPai.cliente_id,
        titulo,
        categoria: (novoTipo === "tarefa" ? novaCategoria : "Operacional") as any,
        subtipo: novoTipo === "tarefa" && novoSubtipo ? novoSubtipo : null,
        descricao: descricaoHerdada,
        status: "Planejamento" as any,
        responsaveis_ids: respsHerdados,
        ...({
          parent_process_id: cardPai.id,
          process_step_order: ordem,
          process_step_type: novoTipo,
          process_step_status: bloqueada ? "bloqueada" : "pendente",
          process_depends_on: dependePai,
          process_step_config: {
            reaproveitar_briefing: reaprovBriefing,
            reaproveitar_anexos: reaprovAnexos,
            reaproveitar_responsaveis: reaprovResp,
            bloquear_ate_concluir: bloquear,
            status_interno_label: novoTipo === "status" ? novoStatusLabel : undefined,
          },
        } as any),
      } as any);

      if (id) {
        setNovoTitulo("");
        setNovoResp("");
        setNovoDepende("");
        toast.success("Etapa adicionada");
      }
    } finally {
      setAdicionando(false);
    }
  };

  const handleConcluirStatus = async (etapa: Demanda) => {
    await updateDemanda(etapa.id, {
      status: "Concluido" as any,
      data_conclusao: new Date().toISOString(),
      process_step_status: "concluida",
    } as any);
    toast.success("Etapa concluída");
  };

  const handleLiberar = async (etapa: Demanda) => {
    await updateDemanda(etapa.id, {
      process_step_status: "pendente",
    } as any);
    toast.success("Etapa liberada manualmente");
  };

  const handleRemover = async (etapa: Demanda) => {
    if (!confirm(`Remover a etapa "${etapa.titulo}"?`)) return;
    await deleteDemanda(etapa.id);
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          Etapas do Processo
          <Badge variant="outline" className="text-[10px]">{etapas.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {etapas.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhuma etapa criada. Use o formulário abaixo para adicionar a primeira.
          </p>
        )}
        {etapas.map((etapa, idx) => {
          const bloqueada = etapa.process_step_status === "bloqueada";
          const ehStatus = etapa.process_step_type === "status";
          const concluida =
            etapa.status === "Concluido" ||
            etapa.status === "Entregue" ||
            etapa.process_step_status === "concluida";
          return (
            <div
              key={etapa.id}
              className="border border-border rounded-md p-2 flex items-start gap-2 bg-card"
            >
              <div className="text-xs text-muted-foreground w-5 pt-1 text-right">{idx + 1}.</div>
              <div className="pt-0.5">{statusIcon(etapa)}</div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-medium text-sm ${concluida ? "line-through text-muted-foreground" : ""}`}>
                    {etapa.titulo}
                  </span>
                  <Badge
                    variant={ehStatus ? "secondary" : "default"}
                    className="text-[10px]"
                  >
                    {ehStatus ? "Status" : "Tarefa"}
                  </Badge>
                  {bloqueada && (
                    <Badge variant="outline" className="text-[10px]">
                      <Lock className="h-3 w-3 mr-1" /> Bloqueada
                    </Badge>
                  )}
                  {concluida && (
                    <Badge className="text-[10px] bg-green-600 hover:bg-green-600">Concluída</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {ehStatus ? (
                    <>Checkpoint manual</>
                  ) : (
                    <>
                      Resp.: {respLabel(etapa.responsaveis_ids?.[0])}
                      {etapa.categoria && <> · Aba: {CATEGORIA_LABEL[etapa.categoria]}</>}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {!ehStatus && (
                    <Button size="sm" variant="outline" onClick={() => setOpenEtapaId(etapa.id)}>
                      <ArrowRight className="h-3 w-3 mr-1" /> Abrir tarefa
                    </Button>
                  )}
                  {ehStatus && !concluida && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bloqueada || !canWrite}
                      onClick={() => handleConcluirStatus(etapa)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Concluir etapa
                    </Button>
                  )}
                  {bloqueada && canWrite && (
                    <Button size="sm" variant="ghost" onClick={() => handleLiberar(etapa)}>
                      Liberar manualmente
                    </Button>
                  )}
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleRemover(etapa)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {canWrite && (
          <div className="border border-dashed border-border rounded-md p-3 space-y-2 mt-2">
            <div className="text-sm font-medium">+ Adicionar etapa</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as ProcessStepType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STEP_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {STEP_TYPE_OPTIONS.find((o) => o.value === novoTipo)?.hint}
                </p>
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder={
                    novoTipo === "status"
                      ? "Ex.: Aguardando aprovação do cliente"
                      : "Ex.: Criar landing page"
                  }
                />
              </div>
              {novoTipo === "tarefa" && (
                <>
                  <div>
                    <Label className="text-xs">Área destino</Label>
                    <Select
                      value={novaCategoria}
                      onValueChange={(v) => {
                        setNovaCategoria(v as DemandaCategoria);
                        setNovoSubtipo("");
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((c) => (
                          <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Subtipo</Label>
                    <Select
                      value={novoSubtipo || "__none"}
                      onValueChange={(v) => setNovoSubtipo(v === "__none" ? "" : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">—</SelectItem>
                        {subtipos.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Responsável</Label>
                    <Select
                      value={novoResp || "__none"}
                      onValueChange={(v) => setNovoResp(v === "__none" ? "" : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">—</SelectItem>
                        {responsaveis.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs">Depende de</Label>
                <Select
                  value={novoDepende || "__auto"}
                  onValueChange={(v) => setNovoDepende(v === "__auto" ? "" : v === "__none" ? "__none" : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto">Etapa anterior (padrão)</SelectItem>
                    <SelectItem value="__none">Nenhuma (liberada)</SelectItem>
                    {etapas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.titulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <label className="flex items-center gap-1.5 text-xs">
                <Checkbox checked={bloquear} onCheckedChange={(v) => setBloquear(!!v)} />
                Bloquear até concluir
              </label>
              {novoTipo === "tarefa" && (
                <>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox checked={reaprovBriefing} onCheckedChange={(v) => setReaprovBriefing(!!v)} />
                    Reaproveitar briefing
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox checked={reaprovAnexos} onCheckedChange={(v) => setReaprovAnexos(!!v)} />
                    Reaproveitar anexos
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox checked={reaprovResp} onCheckedChange={(v) => setReaprovResp(!!v)} />
                    Reaproveitar responsáveis
                  </label>
                </>
              )}
              <div className="ml-auto">
                <Button size="sm" onClick={handleAdicionar} disabled={adicionando}>
                  {adicionando ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                  Adicionar etapa
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <DemandaDetalheDialog
        demanda={etapaAberta}
        onOpenChange={(o) => { if (!o) setOpenEtapaId(null); }}
      />
    </Card>
  );
}
