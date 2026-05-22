import { useEffect, useMemo, useState } from "react";
import { useCRM } from "@/store/crm";
import {
  useCadenciasStore,
  ETAPAS_LABEL,
  STATUS_LABEL,
  TIPO_LABEL,
  SETOR_LABEL,
  SETOR_RESPONSAVEL,
  SETORES_APROVACAO,
  diasSemResposta,
  diasNaEtapaLabel,
  proximaAcao,
  type Cadencia,
  type CadenciaTipo,
  type CadenciaStatus,
  type CadenciaSetor,
} from "@/store/cadenciasOperacionais";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Play, Settings2, Copy, Check, Trash2, ListChecks, Clock, AlertTriangle, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: CadenciaStatus[] = [
  "aguardando_resposta", "sem_retorno", "resolvida",
];

function corDias(d: number): string {
  if (d <= 1) return "text-emerald-600 dark:text-emerald-400";
  if (d <= 3) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

function statusVariant(s: CadenciaStatus): "default" | "secondary" | "destructive" | "outline" {
  if (s === "resolvida") return "secondary";
  if (s === "sem_retorno") return "destructive";
  return "default";
}

export function CadenciasOperacionaisTab() {
  const { clientes, responsaveis } = useCRM();
  const {
    cadencias, execucoes, mensagens, loaded, load,
    create, update, executarEtapa,
  } = useCadenciasStore();

  const [busca, setBusca] = useState("");
  const [fTipo, setFTipo] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fCliente, setFCliente] = useState<string>("all");
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const clientesMap = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const respMap = useMemo(() => new Map(responsaveis.map((r) => [r.id, r])), [responsaveis]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return cadencias.filter((c) => {
      if (fTipo !== "all" && c.tipo !== fTipo) return false;
      if (fStatus !== "all" && c.status !== fStatus) return false;
      if (fCliente !== "all" && c.cliente_id !== fCliente) return false;
      if (q) {
        const nome = clientesMap.get(c.cliente_id)?.nome_cliente ?? "";
        if (!nome.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [cadencias, busca, fTipo, fStatus, fCliente, clientesMap]);

  const kpis = useMemo(() => {
    const ativas = cadencias.filter((c) => c.status !== "resolvida");
    const pendentes = ativas.filter((c) => c.status === "aguardando_resposta").length;
    const sem = ativas.filter((c) => c.status === "sem_retorno" || diasSemResposta(c) >= 3).length;
    const hojeRef = new Date(); hojeRef.setHours(0, 0, 0, 0);
    const hoje = ativas.filter((c) => {
      if (!c.proxima_acao_em) return false;
      const d = new Date(c.proxima_acao_em); d.setHours(0, 0, 0, 0);
      return d.getTime() === hojeRef.getTime();
    }).length;
    return { total: ativas.length, pendentes, sem, hoje };
  }, [cadencias]);

  const detalhe = cadencias.find((c) => c.id === detalheId) ?? null;
  const detalheExec = useMemo(
    () => execucoes.filter((e) => e.cadencia_id === detalheId).sort((a, b) => a.etapa - b.etapa),
    [execucoes, detalheId],
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard compact icon={ListChecks} label="Total" value={kpis.total} tone="primary" />
        <KpiCard compact icon={Clock} label="Pendentes" value={kpis.pendentes} tone="info" />
        <KpiCard compact icon={AlertTriangle} label="Sem resposta" value={kpis.sem} tone={kpis.sem > 0 ? "destructive" : "default"} />
        <KpiCard compact icon={CalendarDays} label="Hoje" value={kpis.hoje} tone={kpis.hoje > 0 ? "warning" : "default"} />
      </div>

      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar cliente…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 w-56 text-xs"
            />
            <Select value={fTipo} onValueChange={setFTipo}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="aprovacao">Aprovação</SelectItem>
                <SelectItem value="recarga">Recarga</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fCliente} onValueChange={setFCliente}>
              <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setConfigOpen(true)}>
                <Settings2 className="h-3.5 w-3.5 mr-1" /> Mensagens
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={() => setNovoOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Nova cadência
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Etapa atual</TableHead>
                  <TableHead className="text-xs">Responsável</TableHead>
                  <TableHead className="text-xs">Última ação</TableHead>
                  <TableHead className="text-xs">Próxima ação</TableHead>
                  <TableHead className="text-xs">Dias na etapa</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">
                      Nenhuma cadência encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {filtradas.map((c) => {
                  const dias = diasSemResposta(c);
                  const cli = clientesMap.get(c.cliente_id);
                  const resp = c.responsavel_id ? respMap.get(c.responsavel_id) : null;
                  return (
                    <TableRow key={c.id} className="text-xs">
                      <TableCell className="font-medium">{cli?.nome_cliente ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={c.tipo === "aprovacao" ? "default" : "secondary"} className="text-[10px]">
                          {TIPO_LABEL[c.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell>{ETAPAS_LABEL[c.etapa_atual]}</TableCell>
                      <TableCell>{resp?.nome ?? "—"}</TableCell>
                      <TableCell>{c.ultima_acao_em ? new Date(c.ultima_acao_em).toLocaleString("pt-BR") : "—"}</TableCell>
                      <TableCell>{proximaAcao(c)}</TableCell>
                      <TableCell className={cn("font-semibold tabular-nums", corDias(dias))}>
                        {diasNaEtapaLabel(c)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(c.status)} className="text-[10px]">
                          {STATUS_LABEL[c.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDetalheId(c.id)}>
                            Abrir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={c.status === "resolvida" || c.status === "sem_retorno" || c.etapa_atual >= 4}
                            onClick={async () => {
                              try { await executarEtapa(c.id); toast.success("Etapa executada"); }
                              catch (e: any) { toast.error(e.message ?? "Erro"); }
                            }}
                          >
                            <Play className="h-3 w-3 mr-1" /> Executar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <NovaCadenciaDialog open={novoOpen} onOpenChange={setNovoOpen} />
      <ConfigMensagensDialog open={configOpen} onOpenChange={setConfigOpen} />

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalheId(null)}>
        <DialogContent className="max-w-2xl">
          {detalhe && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Cadência — {clientesMap.get(detalhe.cliente_id)?.nome_cliente} · {TIPO_LABEL[detalhe.tipo]}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Responsável</div>
                    <div className="font-medium">{detalhe.responsavel_id ? respMap.get(detalhe.responsavel_id)?.nome : "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Etapa atual</div>
                    <div className="font-medium">{ETAPAS_LABEL[detalhe.etapa_atual]}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <Select
                      value={detalhe.status}
                      onValueChange={(v) => update(detalhe.id, { status: v as CadenciaStatus })}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold mb-2">Timeline</div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((etapa) => {
                      const exec = detalheExec.find((e) => e.etapa === etapa);
                      const ativa = detalhe.etapa_atual === etapa && !exec;
                      const aguardando = detalhe.etapa_atual < etapa;
                      const msg = mensagens.find((m) => m.tipo === detalhe.tipo && m.etapa === etapa);
                      return (
                        <div key={etapa} className="rounded-md border border-border p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">
                              {exec ? "✅" : ativa ? "🟡" : aguardando ? "⚪" : "✅"} {ETAPAS_LABEL[etapa]}
                              {msg?.titulo ? <span className="text-muted-foreground"> — {msg.titulo}</span> : null}
                            </div>
                            <div className="text-muted-foreground">
                              {exec ? new Date(exec.executado_em).toLocaleString("pt-BR") : ativa ? "Pendente" : "Aguardando"}
                            </div>
                          </div>
                          {msg?.mensagem && (
                            <div className="mt-2 flex items-start gap-2">
                              <div className="flex-1 rounded bg-muted p-2 whitespace-pre-wrap">{msg.mensagem}</div>
                              <Button
                                size="sm" variant="ghost" className="h-7"
                                onClick={() => { navigator.clipboard.writeText(msg.mensagem); toast.success("Copiado"); }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetalheId(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NovaCadenciaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { clientes, responsaveis } = useCRM();
  const { create } = useCadenciasStore();
  const [cliente, setCliente] = useState("");
  const [tipo, setTipo] = useState<CadenciaTipo>("aprovacao");
  const [resp, setResp] = useState<string>("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setCliente(""); setTipo("aprovacao"); setResp(""); setObs(""); }
  }, [open]);

  const submit = async () => {
    if (!cliente) { toast.error("Selecione o cliente"); return; }
    setSaving(true);
    try {
      await create({ cliente_id: cliente, tipo, responsavel_id: resp || null, observacao: obs || null });
      toast.success("Cadência criada");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message ?? "Erro"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova cadência operacional</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs mb-1">Cliente</div>
            <Select value={cliente} onValueChange={setCliente}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs mb-1">Tipo</div>
            <Select value={tipo} onValueChange={(v) => setTipo(v as CadenciaTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aprovacao">Aprovação</SelectItem>
                <SelectItem value="recarga">Recarga</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs mb-1">Responsável</div>
            <Select value={resp} onValueChange={setResp}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs mb-1">Observação</div>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfigMensagensDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mensagens, upsertMensagem, removeMensagem } = useCadenciasStore();
  const [tab, setTab] = useState<CadenciaTipo>("aprovacao");
  const [editing, setEditing] = useState<Record<string, { titulo: string; mensagem: string }>>({});

  const lista = mensagens
    .filter((m) => m.tipo === tab)
    .sort((a, b) => a.etapa - b.etapa || a.ordem - b.ordem);

  const getVal = (id: string, field: "titulo" | "mensagem", fallback: string) =>
    editing[id]?.[field] ?? fallback;

  const setVal = (id: string, field: "titulo" | "mensagem", value: string, base: { titulo: string; mensagem: string }) =>
    setEditing((s) => ({ ...s, [id]: { ...base, ...(s[id] ?? {}), [field]: value } }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Mensagens padrão das cadências</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as CadenciaTipo)}>
          <TabsList>
            <TabsTrigger value="aprovacao">Aprovação</TabsTrigger>
            <TabsTrigger value="recarga">Recarga</TabsTrigger>
          </TabsList>
          {(["aprovacao", "recarga"] as const).map((t) => (
            <TabsContent key={t} value={t} className="space-y-3 mt-3">
              {lista.map((m) => {
                const base = { titulo: m.titulo, mensagem: m.mensagem };
                return (
                  <div key={m.id} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{ETAPAS_LABEL[m.etapa]}</Badge>
                      <Input
                        className="h-7 text-xs"
                        value={getVal(m.id, "titulo", m.titulo)}
                        onChange={(e) => setVal(m.id, "titulo", e.target.value, base)}
                      />
                    </div>
                    <Textarea
                      rows={3}
                      value={getVal(m.id, "mensagem", m.mensagem)}
                      onChange={(e) => setVal(m.id, "mensagem", e.target.value, base)}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => { navigator.clipboard.writeText(getVal(m.id, "mensagem", m.mensagem)); toast.success("Copiado"); }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                      </Button>
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs"
                        onClick={async () => {
                          try {
                            await upsertMensagem({
                              id: m.id, tipo: m.tipo, etapa: m.etapa,
                              titulo: getVal(m.id, "titulo", m.titulo),
                              mensagem: getVal(m.id, "mensagem", m.mensagem),
                            });
                            toast.success("Salvo");
                            setEditing((s) => { const n = { ...s }; delete n[m.id]; return n; });
                          } catch (e: any) { toast.error(e.message ?? "Erro"); }
                        }}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Salvar
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                        onClick={async () => {
                          if (!confirm("Remover esta mensagem?")) return;
                          await removeMensagem(m.id);
                          toast.success("Removida");
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button
                size="sm" variant="outline" className="text-xs"
                onClick={async () => {
                  const proxEtapa = ((lista[lista.length - 1]?.etapa ?? 0) % 4) + 1;
                  await upsertMensagem({ tipo: t, etapa: proxEtapa, titulo: "Nova mensagem", mensagem: "" });
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar mensagem
              </Button>
            </TabsContent>
          ))}
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
