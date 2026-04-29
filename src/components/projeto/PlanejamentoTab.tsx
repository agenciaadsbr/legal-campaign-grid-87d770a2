import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Circle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  FileText,
  FileDown,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CheckSquare,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PLAN_BLOCOS,
  PlanItem,
  PlanSituacao,
  PlanStatus,
  calcularProgresso,
  isItemAtrasado,
  usePlanejamento,
} from "@/store/planejamento";
import { useCRM } from "@/store/crm";
import {
  downloadPdfFromText,
  downloadPngFromNode,
  downloadTxt,
  safeFilename,
} from "./exportUtils";

interface Props {
  clienteId: string;
  novoOpenExterno?: boolean;
  onNovoOpenChangeExterno?: (v: boolean) => void;
}

export function PlanejamentoTab({
  clienteId,
  novoOpenExterno,
  onNovoOpenChangeExterno,
}: Props) {
  const { clientes } = useCRM();
  const cliente = clientes.find((c) => c.id === clienteId);
  const todosItens = usePlanejamento((s) => s.itens);
  const ensureSeed = usePlanejamento((s) => s.ensureSeed);
  const loaded = usePlanejamento((s) => s.loaded);

  useEffect(() => {
    if (loaded) ensureSeed(clienteId);
  }, [loaded, clienteId, ensureSeed]);

  const itens = useMemo(
    () => todosItens.filter((i) => i.cliente_id === clienteId),
    [todosItens, clienteId],
  );

  const progresso = useMemo(() => calcularProgresso(itens), [itens]);

  const [openBlocos, setOpenBlocos] = useState<Record<string, boolean>>({
    onboarding: true,
    campanhas: true,
    conteudo: true,
  });

  const [novoOpen, setNovoOpen] = useState(false);
  useEffect(() => {
    if (novoOpenExterno) {
      setNovoOpen(true);
      onNovoOpenChangeExterno?.(false);
    }
  }, [novoOpenExterno, onNovoOpenChangeExterno]);

  const printRef = useRef<HTMLDivElement>(null);

  const construirTexto = () => {
    const linhas: string[] = [];
    linhas.push(`Planejamento — ${cliente?.nome_cliente ?? ""}`);
    linhas.push(`Progresso: ${progresso.pct}% (${progresso.concluidos}/${progresso.total - progresso.naoAplicavel})`);
    linhas.push(
      `Concluídos: ${progresso.concluidos} • Pendentes: ${progresso.pendentes} • Atrasados: ${progresso.atrasados}`,
    );
    linhas.push("");
    PLAN_BLOCOS.forEach((b) => {
      const itensB = itens.filter((i) => i.bloco === b.key);
      if (itensB.length === 0) return;
      linhas.push(b.label);
      linhas.push("=".repeat(48));
      b.secoes.forEach((s) => {
        const itensS = itensB
          .filter((i) => i.secao === s.key)
          .sort((a, c) => a.ordem - c.ordem);
        if (itensS.length === 0) return;
        linhas.push(s.label);
        itensS.forEach((it) => {
          const marca =
            it.status === "concluido"
              ? "✓"
              : isItemAtrasado(it)
                ? "⚠"
                : "☐";
          linhas.push(`  ${marca} ${it.titulo}`);
          if (it.prazo)
            linhas.push(
              `       Prazo: ${new Date(it.prazo).toLocaleDateString("pt-BR")}`,
            );
        });
        linhas.push("");
      });
    });
    return linhas.join("\n");
  };

  const exportarTxt = () =>
    downloadTxt(`planejamento_${safeFilename(cliente?.nome_cliente ?? "cliente")}`, construirTexto());
  const exportarPdf = () =>
    downloadPdfFromText(
      `planejamento_${safeFilename(cliente?.nome_cliente ?? "cliente")}.pdf`,
      `Planejamento — ${cliente?.nome_cliente ?? ""}`,
      construirTexto(),
    );
  const exportarPng = async () => {
    if (!printRef.current) return;
    try {
      await downloadPngFromNode(
        `planejamento_${safeFilename(cliente?.nome_cliente ?? "cliente")}.png`,
        printRef.current,
      );
    } catch (e: any) {
      toast.error("Erro ao gerar imagem", { description: e?.message });
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar topo */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={exportarTxt}>
            <FileText className="h-4 w-4 mr-1" /> TXT
          </Button>
          <Button variant="outline" size="sm" onClick={exportarPdf}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportarPng}>
            <ImageIcon className="h-4 w-4 mr-1" /> PNG
          </Button>
          <Button size="sm" onClick={() => setNovoOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar item
          </Button>
        </div>
      </div>

      <div ref={printRef} className="space-y-3 bg-background">
        {/* Card de progresso */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Progresso geral</div>
              <div className="text-2xl font-bold tabular-nums">{progresso.pct}%</div>
            </div>
            <Progress value={progresso.pct} className="h-2" />
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              <Mini label="Total" value={progresso.total} />
              <Mini label="Concluídos" value={progresso.concluidos} accent="success" />
              <Mini label="Pendentes" value={progresso.pendentes} accent="warn" />
              <Mini label="Atrasados" value={progresso.atrasados} accent="danger" />
              <Mini label="Já possui" value={progresso.jaPossui} accent="muted" />
              <Mini label="Não aplic." value={progresso.naoAplicavel} accent="muted" />
            </div>
          </CardContent>
        </Card>

        {/* Blocos lado a lado (kanban-style) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
          {PLAN_BLOCOS.map((bloco) => {
            const itensBloco = itens.filter((i) => i.bloco === bloco.key);
            return (
              <Collapsible
                key={bloco.key}
                open={openBlocos[bloco.key]}
                onOpenChange={(v) =>
                  setOpenBlocos((s) => ({ ...s, [bloco.key]: v }))
                }
              >
                <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 p-2 text-left hover:bg-accent/30 border-b border-border"
                    >
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform shrink-0",
                          !openBlocos[bloco.key] && "-rotate-90",
                        )}
                      />
                      <span className="text-xs font-semibold flex-1 truncate">
                        {bloco.label}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {itensBloco.length}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-2 space-y-2">
                      {bloco.secoes.map((secao) => {
                        const itensSecao = itensBloco
                          .filter((i) => i.secao === secao.key)
                          .sort((a, b) => a.ordem - b.ordem);
                        return (
                          <SecaoBlock
                            key={secao.key}
                            clienteId={clienteId}
                            bloco={bloco.key}
                            secao={secao}
                            itens={itensSecao}
                          />
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </div>

      <NovoItemDialog
        open={novoOpen}
        onOpenChange={setNovoOpen}
        clienteId={clienteId}
      />
    </div>
  );
}

// ============================================================
// MINI METRICA
// ============================================================
function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "success" | "warn" | "danger" | "muted";
}) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1.5">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-base font-bold tabular-nums",
          accent === "success" && "text-emerald-500",
          accent === "warn" && "text-amber-500",
          accent === "danger" && "text-destructive",
          accent === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================
// SEÇÃO
// ============================================================
function SecaoBlock({
  clienteId,
  bloco,
  secao,
  itens,
}: {
  clienteId: string;
  bloco: string;
  secao: { key: string; label: string; icone: string };
  itens: PlanItem[];
}) {
  const create = usePlanejamento((s) => s.create);
  const [adicionando, setAdicionando] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");

  const adicionar = async () => {
    if (!novoTitulo.trim()) return;
    await create({
      cliente_id: clienteId,
      bloco,
      secao: secao.key,
      titulo: novoTitulo.trim(),
      ordem: itens.length,
    });
    setNovoTitulo("");
    setAdicionando(false);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {secao.label}
        </h4>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 px-1 text-[10px] ml-auto"
          onClick={() => setAdicionando(true)}
        >
          <Plus className="h-3 w-3 mr-0.5" /> item
        </Button>
      </div>
      <div className="space-y-1">
        {itens.length === 0 && !adicionando && (
          <div className="text-[11px] text-muted-foreground italic px-1 py-2">
            Nenhum item nesta seção.
          </div>
        )}
        {itens.map((it) => (
          <ItemRow key={it.id} item={it} />
        ))}
        {adicionando && (
          <div className="flex items-center gap-1 px-1 py-1">
            <Input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Novo item..."
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") adicionar();
                if (e.key === "Escape") {
                  setAdicionando(false);
                  setNovoTitulo("");
                }
              }}
            />
            <Button size="sm" className="h-7" onClick={adicionar}>
              <Save className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={() => {
                setAdicionando(false);
                setNovoTitulo("");
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ITEM ROW (edição inline)
// ============================================================
function ItemRow({
  item,
}: {
  item: PlanItem;
}) {
  const update = usePlanejamento((s) => s.update);
  const remove = usePlanejamento((s) => s.remove);
  const { responsaveis } = useCRM();

  const [expand, setExpand] = useState(false);
  const atrasado = isItemAtrasado(item);
  const responsavel = responsaveis.find((r) => r.id === item.responsavel_id);

  const efetivoConcluido = item.status === "concluido";

  const toggleConcluido = async () => {
    await update(item.id, {
      status: efetivoConcluido ? "pendente" : "concluido",
    });
  };

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card",
        atrasado && "border-destructive/50",
        item.situacao === "ja_possui" && "bg-muted/40",
        item.situacao === "nao_aplicavel" && "opacity-60",
      )}
    >
      <div className="flex items-start gap-1.5 px-1.5 py-1">
        <button
          type="button"
          onClick={toggleConcluido}
          title={efetivoConcluido ? "Marcar como pendente" : "Marcar como feito"}
          className="mt-0.5 shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {efetivoConcluido ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "text-[12px] leading-tight",
                efetivoConcluido && "line-through text-muted-foreground",
              )}
            >
              {item.titulo}
            </span>
            <SituacaoBadge value={item.situacao} />
            {atrasado && (
              <Badge variant="destructive" className="text-[9px] h-4 px-1 py-0">
                <AlertTriangle className="h-2 w-2 mr-0.5" /> atrasado
              </Badge>
            )}
            {item.prazo && (
              <Badge variant="outline" className="text-[9px] h-4 px-1 py-0">
                <Clock className="h-2 w-2 mr-0.5" />
                {new Date(item.prazo).toLocaleDateString("pt-BR")}
              </Badge>
            )}
            {responsavel && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1 py-0">
                {responsavel.nome}
              </Badge>
            )}
          </div>
          {item.descricao && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {item.descricao}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={() => setExpand((e) => !e)}
            title="Editar"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(`Remover "${item.titulo}"?`)) remove(item.id);
            }}
            title="Remover"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {expand && (
        <div className="border-t border-border p-3 space-y-3 bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Título
              </label>
              <Input
                value={item.titulo}
                onChange={(e) => update(item.id, { titulo: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={item.status}
                onValueChange={(v) => update(item.id, { status: v as PlanStatus })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Situação do cliente
              </label>
              <Select
                value={item.situacao}
                onValueChange={(v) =>
                  update(item.id, { situacao: v as PlanSituacao })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="precisa_criar">Precisa criar</SelectItem>
                  <SelectItem value="ja_possui">Já possui</SelectItem>
                  <SelectItem value="nao_aplicavel">Não aplicável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Responsável
              </label>
              <Select
                value={item.responsavel_id ?? "none"}
                onValueChange={(v) =>
                  update(item.id, {
                    responsavel_id: v === "none" ? null : v,
                  })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {responsaveis.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Prazo
              </label>
              <Input
                type="date"
                value={item.prazo ?? ""}
                onChange={(e) =>
                  update(item.id, { prazo: e.target.value || null })
                }
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Prioridade
              </label>
              <Select
                value={item.prioridade}
                onValueChange={(v) =>
                  update(item.id, { prioridade: v as any })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground">
                Descrição
              </label>
              <Textarea
                value={item.descricao ?? ""}
                onChange={(e) =>
                  update(item.id, { descricao: e.target.value || null })
                }
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground">
                Observação
              </label>
              <Textarea
                value={item.observacao ?? ""}
                onChange={(e) =>
                  update(item.id, { observacao: e.target.value || null })
                }
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setExpand(false)}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SITUACAO BADGE
// ============================================================
function SituacaoBadge({ value }: { value: PlanSituacao }) {
  if (value === "precisa_criar") return null;
  if (value === "ja_possui")
    return (
      <Badge variant="secondary" className="text-[9px]">
        <CheckSquare className="h-2.5 w-2.5 mr-0.5" /> já possui
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-[9px]">
      <Ban className="h-2.5 w-2.5 mr-0.5" /> não aplicável
    </Badge>
  );
}

// ============================================================
// NOVO ITEM DIALOG
// ============================================================
function NovoItemDialog({
  open,
  onOpenChange,
  clienteId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: string;
}) {
  const create = usePlanejamento((s) => s.create);
  const [bloco, setBloco] = useState(PLAN_BLOCOS[0].key);
  const [secao, setSecao] = useState(PLAN_BLOCOS[0].secoes[0].key);
  const [titulo, setTitulo] = useState("");

  useEffect(() => {
    if (open) {
      setBloco(PLAN_BLOCOS[0].key);
      setSecao(PLAN_BLOCOS[0].secoes[0].key);
      setTitulo("");
    }
  }, [open]);

  const secoes = PLAN_BLOCOS.find((b) => b.key === bloco)?.secoes ?? [];

  const submit = async () => {
    if (!titulo.trim()) return;
    await create({
      cliente_id: clienteId,
      bloco,
      secao,
      titulo: titulo.trim(),
      ordem: 999,
    });
    onOpenChange(false);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Adicionar item ao planejamento</h3>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Bloco
              </label>
              <Select
                value={bloco}
                onValueChange={(v) => {
                  setBloco(v);
                  const novaSecao =
                    PLAN_BLOCOS.find((b) => b.key === v)?.secoes[0]?.key ?? "";
                  setSecao(novaSecao);
                }}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_BLOCOS.map((b) => (
                    <SelectItem key={b.key} value={b.key}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Seção
              </label>
              <Select value={secao} onValueChange={setSecao}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {secoes.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.icone} {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">
              Título
            </label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Configurar pixel do Meta"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={submit} disabled={!titulo.trim()}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
