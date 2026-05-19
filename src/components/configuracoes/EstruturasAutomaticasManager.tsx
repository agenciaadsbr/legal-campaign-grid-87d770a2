import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useOperationalTemplates,
  useOperationalTemplatesBootstrap,
  type OperationalTemplate,
} from "@/store/operationalTemplates";
import { useCRM } from "@/store/crm";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { PRIORIDADES } from "@/lib/demandas-categorias";

export function EstruturasAutomaticasManager() {
  useOperationalTemplatesBootstrap();
  const templates = useOperationalTemplates((s) => s.templates);
  const create = useOperationalTemplates((s) => s.create);
  const update = useOperationalTemplates((s) => s.update);
  const remove = useOperationalTemplates((s) => s.remove);
  const { responsaveis } = useCRM();

  const [novoNome, setNovoNome] = useState("");

  const handleAdd = async () => {
    if (!novoNome.trim()) return;
    await create({ nome: novoNome.trim() });
    setNovoNome("");
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">Estruturas automáticas — Onboarding Operacional</CardTitle>
          <p className="text-xs text-muted-foreground">
            Templates de tarefas criadas automaticamente quando um novo cliente é cadastrado.
            Clientes antigos podem receber a estrutura via botão "Gerar estrutura operacional" na aba Operacional do projeto.
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nome do novo template (ex: Configurar Pixel)"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              className="h-8 text-xs"
            />
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>

          <div className="space-y-1">
            {templates.length === 0 && (
              <div className="text-xs text-muted-foreground p-3 text-center">
                Nenhum template cadastrado.
              </div>
            )}
            {templates.map((t) => (
              <TemplateRow
                key={t.id}
                template={t}
                responsaveis={responsaveis}
                onUpdate={(patch) => update(t.id, patch)}
                onRemove={() => remove(t.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TemplateRow({
  template, responsaveis, onUpdate, onRemove,
}: {
  template: OperationalTemplate;
  responsaveis: { id: string; nome: string }[];
  onUpdate: (patch: Partial<OperationalTemplate>) => void;
  onRemove: () => void;
}) {
  const [nome, setNome] = useState(template.nome);
  const [ordem, setOrdem] = useState(template.ordem);

  useEffect(() => { setNome(template.nome); setOrdem(template.ordem); }, [template.id]);

  return (
    <div className="flex items-center gap-2 p-2 rounded-md border bg-card">
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        type="number"
        value={ordem}
        onChange={(e) => setOrdem(Number(e.target.value))}
        onBlur={() => { if (ordem !== template.ordem) onUpdate({ ordem }); }}
        className="h-7 w-16 text-xs"
      />
      <Input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onBlur={() => { if (nome !== template.nome) onUpdate({ nome }); }}
        className="h-7 text-xs flex-1"
      />
      <Select
        value={template.prioridade}
        onValueChange={(v) => onUpdate({ prioridade: v as any })}
      >
        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select
        value={template.responsavel_padrao_id ?? "__none"}
        onValueChange={(v) => onUpdate({ responsavel_padrao_id: v === "__none" ? null : v })}
      >
        <SelectTrigger className="h-7 w-40 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">— Sem responsável —</SelectItem>
          {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
        </SelectContent>
      </Select>
      <Label className="flex items-center gap-1.5 text-xs">
        <Switch
          checked={template.ativo}
          onCheckedChange={(v) => onUpdate({ ativo: v })}
        />
        Ativo
      </Label>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
