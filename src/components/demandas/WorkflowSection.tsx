import { useState } from "react";
import { Demanda, useDemandas } from "@/store/demandas";
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
import { Plus, Link2, ChevronDown, ChevronUp } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import type { ModoLiberacao } from "@/lib/workflow";

interface Props {
  pai: Demanda;
}

export function WorkflowSection({ pai }: Props) {
  const createProximaEtapa = useDemandas((s) => s.createProximaEtapa);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<DemandaCategoria>(pai.categoria);
  const [subtipo, setSubtipo] = useState<string>("");
  const [prioridade, setPrioridade] = useState<DemandaPrioridade>("Media");
  const [prazo, setPrazo] = useState<string>("");
  const [bloquear, setBloquear] = useState(true);
  const [modo, setModo] = useState<ModoLiberacao>("automatico");
  const [descricao, setDescricao] = useState<string>("");
  const [herdarDescricao, setHerdarDescricao] = useState(false);
  const [herdarLinks, setHerdarLinks] = useState(false);
  const [herdarAnexos, setHerdarAnexos] = useState(false);

  const reset = () => {
    setTitulo("");
    setSubtipo("");
    setPrioridade("Media");
    setPrazo("");
    setBloquear(true);
    setModo("automatico");
    setDescricao("");
    setHerdarDescricao(false);
    setHerdarLinks(false);
    setHerdarAnexos(false);
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

  const salvar = async () => {
    if (!titulo.trim()) return;
    setSalvando(true);
    try {
      await createProximaEtapa(
        pai.id,
        {
          titulo: titulo.trim(),
          cliente_id: pai.cliente_id,
          categoria,
          subtipo: subtipo.trim() || null,
          prioridade,
          data_limite: prazo ? new Date(prazo).toISOString() : null,
          descricao: descricao.trim() ? descricao : null,
          link_meister: herdarLinks ? pai.link_meister : null,
          link_drive: herdarLinks ? pai.link_drive : null,
        },
        {
          modo_liberacao: modo,
          bloquear,
          herdar_anexos: herdarAnexos,
        },
      );
      reset();
      setAberto(false);
    } finally {
      setSalvando(false);
    }
  };

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

          <div>
            <Label className="text-[11px]">Título da próxima tarefa</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Subir campanha Meta"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label className="text-[11px]">Categoria</Label>
              <Select value={categoria} onValueChange={(v) => { setCategoria(v as DemandaCategoria); setSubtipo(""); }}>
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
                <Select value={subtipo || "__none__"} onValueChange={(v) => setSubtipo(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar" /></SelectTrigger>
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

          <div>
            <Label className="text-[11px]">Prazo</Label>
            <Input
              type="datetime-local"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="border-t pt-2 space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={bloquear} onCheckedChange={(v) => setBloquear(!!v)} />
              <span>Bloquear execução até concluir esta tarefa</span>
            </label>
            {bloquear && (
              <div className="pl-6">
                <Label className="text-[11px]">Modo de liberação</Label>
                <RadioGroup value={modo} onValueChange={(v) => setModo(v as ModoLiberacao)} className="flex gap-4 mt-1">
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

          <div className="border-t pt-2 space-y-1.5">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Reaproveitar desta tarefa
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={herdarDescricao} onCheckedChange={(v) => setHerdarDescricao(!!v)} />
              Descrição / briefing
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={herdarLinks} onCheckedChange={(v) => setHerdarLinks(!!v)} />
              Links (Meister / Drive)
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={herdarAnexos} onCheckedChange={(v) => setHerdarAnexos(!!v)} />
              Anexos
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={() => setAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button size="sm" onClick={salvar} disabled={!titulo.trim() || salvando} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Criar próxima etapa
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
