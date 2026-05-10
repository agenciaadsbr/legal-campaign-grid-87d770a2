import { useState, useRef } from "react";
import { Demanda, useDemandas, getResponsaveisIds } from "@/store/demandas";
import { useCRM } from "@/store/crm";
import {
  CATEGORIAS,
  CATEGORIA_LABEL,
  CATEGORIA_SUBTIPOS,
  PRIORIDADES,
  PRIORIDADE_LABEL,
  type DemandaCategoria,
  type DemandaPrioridade,
} from "@/lib/demandas-categorias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Link2,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  FileText,
} from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ModoLiberacao } from "@/lib/workflow";

interface Props {
  pai: Demanda;
}

const CATEGORIAS_COM_LINKS: DemandaCategoria[] = [
  "EditorVideo",
  "TrafegoPago",
  "LandingPage",
  "IAAtendimento",
  "Personalizado",
];

const MAX_ANEXO_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

const isImage = (f: File) => f.type.startsWith("image/");
const isVideo = (f: File) => f.type.startsWith("video/");

export function WorkflowSection({ pai }: Props) {
  const createProximaEtapa = useDemandas((s) => s.createProximaEtapa);
  const addAnexo = useDemandas((s) => s.addAnexo);
  const { responsaveis } = useCRM();

  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // --- Campos espelhados do detalhe da tarefa ---
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<DemandaCategoria>(pai.categoria);
  const [subtipo, setSubtipo] = useState<string>("");
  const [prioridade, setPrioridade] = useState<DemandaPrioridade>("Media");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataLimite, setDataLimite] = useState<string>("");
  const [responsaveisIds, setResponsaveisIds] = useState<string[]>([]);
  const [linkMeister, setLinkMeister] = useState("");
  const [linkDrive, setLinkDrive] = useState("");
  const [descricao, setDescricao] = useState<string>("");
  const [anexosPendentes, setAnexosPendentes] = useState<File[]>([]);
  const anexoInputRef = useRef<HTMLInputElement>(null);

  // --- Específicos da continuidade ---
  const [bloquear, setBloquear] = useState(true);
  const [modo, setModo] = useState<ModoLiberacao>("automatico");
  const [herdarDescricao, setHerdarDescricao] = useState(false);
  const [herdarLinks, setHerdarLinks] = useState(false);
  const [herdarAnexos, setHerdarAnexos] = useState(false);
  const [herdarResponsaveis, setHerdarResponsaveis] = useState(false);

  const reset = () => {
    setTitulo("");
    setCategoria(pai.categoria);
    setSubtipo("");
    setPrioridade("Media");
    setDataInicio("");
    setDataLimite("");
    setResponsaveisIds([]);
    setLinkMeister("");
    setLinkDrive("");
    setDescricao("");
    setAnexosPendentes([]);
    setBloquear(true);
    setModo("automatico");
    setHerdarDescricao(false);
    setHerdarLinks(false);
    setHerdarAnexos(false);
    setHerdarResponsaveis(false);
  };

  const toggleHerdarDescricao = (v: boolean) => {
    setHerdarDescricao(v);
    if (v) {
      const base = (pai.descricao ?? "").trim();
      if (base && !descricao.trim()) setDescricao(pai.descricao ?? "");
    } else {
      if (descricao === (pai.descricao ?? "")) setDescricao("");
    }
  };

  const toggleHerdarLinks = (v: boolean) => {
    setHerdarLinks(v);
    if (v) {
      if (!linkMeister.trim() && pai.link_meister) setLinkMeister(pai.link_meister);
      if (!linkDrive.trim() && pai.link_drive) setLinkDrive(pai.link_drive);
    } else {
      if (linkMeister === (pai.link_meister ?? "")) setLinkMeister("");
      if (linkDrive === (pai.link_drive ?? "")) setLinkDrive("");
    }
  };

  const toggleHerdarResponsaveis = (v: boolean) => {
    setHerdarResponsaveis(v);
    const idsPai = getResponsaveisIds(pai);
    if (v) {
      if (responsaveisIds.length === 0 && idsPai.length > 0) {
        setResponsaveisIds(idsPai);
      }
    } else {
      const same =
        responsaveisIds.length === idsPai.length &&
        responsaveisIds.every((x) => idsPai.includes(x));
      if (same) setResponsaveisIds([]);
    }
  };

  const onPickAnexos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const validos: File[] = [];
    for (const f of files) {
      if (f.size > MAX_ANEXO_BYTES) {
        toast.error(`"${f.name}" é muito grande`, {
          description: `Tamanho ${formatBytes(f.size)} excede o limite de 5 GB.`,
        });
        continue;
      }
      validos.push(f);
    }
    setAnexosPendentes((prev) => [...prev, ...validos]);
    e.target.value = "";
  };

  const removerPendente = (idx: number) => {
    setAnexosPendentes((prev) => prev.filter((_, i) => i !== idx));
  };

  const mostrarLinks = CATEGORIAS_COM_LINKS.includes(categoria);

  const salvar = async () => {
    if (!titulo.trim()) return;
    setSalvando(true);
    try {
      const novaId = await createProximaEtapa(
        pai.id,
        {
          titulo: titulo.trim(),
          cliente_id: pai.cliente_id,
          categoria,
          subtipo: subtipo.trim() || null,
          prioridade,
          data_inicio: dataInicio ? new Date(dataInicio).toISOString() : null,
          data_limite: dataLimite ? new Date(dataLimite).toISOString() : null,
          descricao: descricao.trim() ? descricao : null,
          link_meister: mostrarLinks && linkMeister.trim() ? linkMeister.trim() : null,
          link_drive: mostrarLinks && linkDrive.trim() ? linkDrive.trim() : null,
          responsaveis_ids: responsaveisIds,
        },
        {
          modo_liberacao: modo,
          bloquear,
          herdar_anexos: herdarAnexos,
        },
      );

      // Upload dos anexos pendentes (após a demanda existir)
      if (novaId && anexosPendentes.length > 0) {
        const toastId = toast.loading(
          anexosPendentes.length === 1
            ? "Enviando anexo..."
            : `Enviando ${anexosPendentes.length} anexos...`,
        );
        let okCount = 0;
        for (const f of anexosPendentes) {
          const safeName = sanitizeFileName(f.name);
          const path = `demandas/${novaId}/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}-${safeName}`;
          const { error: upErr } = await supabase.storage
            .from("anexos")
            .upload(path, f, {
              contentType: f.type || undefined,
              upsert: false,
              cacheControl: "3600",
            });
          if (upErr) {
            toast.error(`Falha ao enviar "${f.name}"`, { description: upErr.message });
            continue;
          }
          const { data: pub } = supabase.storage.from("anexos").getPublicUrl(path);
          await addAnexo({
            demanda_id: novaId,
            nome: f.name,
            url: pub.publicUrl,
            mime: f.type || null,
            size: f.size,
          });
          okCount += 1;
        }
        if (okCount > 0) {
          toast.success(`${okCount} anexo(s) adicionado(s)`, { id: toastId });
        } else {
          toast.dismiss(toastId);
        }
      }

      reset();
      setAberto(false);
    } finally {
      setSalvando(false);
    }
  };

  const responsaveisSelecionados = responsaveis.filter((r) =>
    responsaveisIds.includes(r.id),
  );

  return (
    <Card className="shrink-0 overflow-hidden border-dashed">
      <CardHeader className="pb-1.5 pt-2.5 px-3">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-xs uppercase tracking-wide flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5" />
            Workflow / Continuidade
          </CardTitle>
          {aberto ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {aberto && (
        <CardContent className="space-y-2 px-3 pb-3">
          <div className="text-[11px] text-muted-foreground">
            Crie uma próxima etapa que depende da conclusão desta tarefa.
          </div>

          {/* Título */}
          <div>
            <Label className="text-[11px]">Título da próxima tarefa</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Subir campanha Meta"
              className="h-8 text-xs"
            />
          </div>

          {/* Categoria · Subtipo · Prioridade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label className="text-[11px]">Categoria</Label>
              <Select
                value={categoria}
                onValueChange={(v) => {
                  setCategoria(v as DemandaCategoria);
                  setSubtipo("");
                }}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">Subtipo</Label>
              {categoria === "Personalizado" ? (
                <Input
                  value={subtipo}
                  onChange={(e) => setSubtipo(e.target.value)}
                  placeholder="Descreva"
                  className="h-8 text-xs"
                />
              ) : (
                <Select
                  value={subtipo || "__none__"}
                  onValueChange={(v) => setSubtipo(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Não definido —</SelectItem>
                    {(CATEGORIA_SUBTIPOS[categoria] ?? []).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-[11px]">Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as DemandaPrioridade)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => (
                    <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">Data início</Label>
              <Input
                type="datetime-local"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px]">Data limite</Label>
              <Input
                type="datetime-local"
                value={dataLimite}
                onChange={(e) => setDataLimite(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Responsáveis */}
          <div>
            <Label className="text-[11px]">Responsáveis</Label>
            <div className="mt-1">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="group flex items-center gap-2 rounded-md border border-transparent hover:border-border hover:bg-accent px-2 py-1 -mx-2 transition-colors min-h-[36px] w-full"
                  >
                    {responsaveisSelecionados.length > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {responsaveisSelecionados.map((r) => (
                          <div key={r.id} className="flex items-center gap-1.5">
                            <div
                              className="h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center"
                              style={{ backgroundColor: r.cor }}
                            >
                              {r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                            </div>
                            <span className="text-xs">{r.nome}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        + atribuir responsáveis
                      </span>
                    )}
                    <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="text-[11px] text-muted-foreground px-2 pb-1.5">
                    Responsáveis
                  </div>
                  <div className="max-h-60 overflow-auto space-y-0.5">
                    <button
                      type="button"
                      onClick={() => setResponsaveisIds([])}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" /> Limpar todos
                    </button>
                    {responsaveis.map((r) => {
                      const active = responsaveisIds.includes(r.id);
                      return (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => {
                            setResponsaveisIds((prev) =>
                              active ? prev.filter((x) => x !== r.id) : [...prev, r.id],
                            );
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm",
                            active && "bg-accent",
                          )}
                        >
                          <div
                            className="h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0"
                            style={{ backgroundColor: r.cor }}
                          >
                            {r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </div>
                          <span className="truncate">{r.nome}</span>
                        </button>
                      );
                    })}
                    {responsaveis.length === 0 && (
                      <div className="text-xs text-muted-foreground px-2 py-3 text-center">
                        Nenhum responsável cadastrado
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Anexos */}
          <div className="border-t pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-[11px]">Anexos</Label>
              <input
                ref={anexoInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={onPickAnexos}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-primary hover:text-primary"
                onClick={() => anexoInputRef.current?.click()}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar anexo
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {anexosPendentes.map((f, idx) => {
                const url = URL.createObjectURL(f);
                const img = isImage(f);
                const vid = !img && isVideo(f);
                return (
                  <div
                    key={idx}
                    className="group relative h-16 w-16 border rounded-lg overflow-hidden bg-muted/30"
                    title={f.name}
                  >
                    {img ? (
                      <img src={url} alt={f.name} className="w-full h-full object-cover" />
                    ) : vid ? (
                      <video src={url} muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full p-1 text-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="text-[9px] mt-0.5 truncate w-full leading-tight">
                          {f.name}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removerPendente(idx)}
                      className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/90 border border-border text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground shadow-sm"
                      title="Remover"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => anexoInputRef.current?.click()}
                className="flex flex-col items-center justify-center h-16 w-16 border border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Adicionar anexo"
              >
                <Plus className="h-4 w-4" />
                <span className="text-[9px] mt-0.5">Anexar</span>
              </button>
            </div>
            {anexosPendentes.length > 0 && (
              <div className="text-[10px] text-muted-foreground mt-1">
                Os arquivos serão enviados quando a próxima etapa for criada.
              </div>
            )}
          </div>

          {/* Links Meister / Drive */}
          {mostrarLinks && (
            <div className="border-t pt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">Link do Meister</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={linkMeister}
                  onChange={(e) => setLinkMeister(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px]">Link do Drive</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={linkDrive}
                  onChange={(e) => setLinkDrive(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* Atividade / Briefing */}
          <div className="border-t pt-2">
            <Label className="text-[11px]">Atividade / Briefing</Label>
            <div className="border rounded-md overflow-hidden mt-1">
              <RichTextEditor
                value={descricao}
                onChange={setDescricao}
                placeholder="Detalhes internos da próxima tarefa: contexto, requisitos, referências…"
                minHeight="80px"
              />
            </div>
          </div>

          {/* Bloqueio */}
          <div className="border-t pt-2 space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={bloquear} onCheckedChange={(v) => setBloquear(!!v)} />
              <span>Bloquear execução até concluir esta tarefa</span>
            </label>
            {bloquear && (
              <div className="pl-6">
                <Label className="text-[11px]">Modo de liberação</Label>
                <RadioGroup
                  value={modo}
                  onValueChange={(v) => setModo(v as ModoLiberacao)}
                  className="flex gap-4 mt-1"
                >
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <RadioGroupItem value="automatico" /> Automático
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <RadioGroupItem value="manual" /> Manual
                  </label>
                </RadioGroup>
              </div>
            )}
          </div>

          {/* Reaproveitar */}
          <div className="border-t pt-2 space-y-1.5">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Reaproveitar desta tarefa
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={herdarDescricao}
                onCheckedChange={(v) => toggleHerdarDescricao(!!v)}
              />
              Descrição / briefing
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={herdarLinks}
                onCheckedChange={(v) => toggleHerdarLinks(!!v)}
              />
              Links (Meister / Drive)
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={herdarResponsaveis}
                onCheckedChange={(v) => toggleHerdarResponsaveis(!!v)}
              />
              Responsáveis
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={herdarAnexos}
                onCheckedChange={(v) => setHerdarAnexos(!!v)}
              />
              Anexos (cópia dos anexos atuais)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={() => { reset(); setAberto(false); }} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={salvar}
              disabled={!titulo.trim() || salvando}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              {salvando ? "Criando..." : "Criar próxima etapa"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
