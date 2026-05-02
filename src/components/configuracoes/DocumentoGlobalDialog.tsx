import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X } from "lucide-react";
import {
  DOC_GLOBAL_CATEGORIAS,
  DocGlobalBloco,
  DocGlobalEscopo,
  DocumentoGlobal,
  useDocumentosGlobais,
} from "@/store/documentosGlobais";
import { DOC_BLOCO_LABEL, DOC_BLOCOS, TIPOS_POR_BLOCO } from "@/store/documentacao";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  escopoInicial: DocGlobalEscopo;
  item?: DocumentoGlobal | null;
}

export function DocumentoGlobalDialog({ open, onOpenChange, escopoInicial, item }: Props) {
  const create = useDocumentosGlobais((s) => s.create);
  const update = useDocumentosGlobais((s) => s.update);

  const [escopo, setEscopo] = useState<DocGlobalEscopo>(escopoInicial);
  const [titulo, setTitulo] = useState("");
  const [bloco, setBloco] = useState<DocGlobalBloco>("materiais");
  const [tipo, setTipo] = useState("material");
  const [categoria, setCategoria] = useState<string>("Outros");
  const [descricao, setDescricao] = useState("");
  const [url, setUrl] = useState("");
  const [arquivoUrl, setArquivoUrl] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [obsInterna, setObsInterna] = useState("");
  const [aplicarAuto, setAplicarAuto] = useState(true);
  const [permissao, setPermissao] = useState<"todos" | "admin">("todos");
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setEscopo(item.escopo);
      setTitulo(item.titulo);
      setBloco(item.bloco);
      setTipo(item.tipo);
      setCategoria(item.categoria);
      setDescricao(item.descricao ?? "");
      setUrl(item.url ?? "");
      setArquivoUrl(item.arquivo_url ?? "");
      setLogin(item.login ?? "");
      setSenha(item.senha ?? "");
      setObsInterna(item.observacao_interna ?? "");
      setAplicarAuto(item.aplicar_automatico);
      setPermissao(item.permissao_acesso);
      setAtivo(item.ativo);
    } else {
      setEscopo(escopoInicial);
      setTitulo("");
      setBloco("materiais");
      setTipo("material");
      setCategoria("Outros");
      setDescricao("");
      setUrl("");
      setArquivoUrl("");
      setLogin("");
      setSenha("");
      setObsInterna("");
      setAplicarAuto(escopoInicial === "cliente");
      setPermissao("todos");
      setAtivo(true);
    }
  }, [open, item, escopoInicial]);

  // Quando troca o bloco, garante tipo válido
  useEffect(() => {
    const tipos = TIPOS_POR_BLOCO[bloco] ?? [];
    if (!tipos.find((t) => t.value === tipo)) {
      setTipo(tipos.find((t) => t.value !== "mensagem")?.value ?? tipos[0]?.value ?? "outro");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloco]);

  const submit = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    const payload = {
      escopo,
      titulo: titulo.trim(),
      tipo,
      bloco,
      categoria,
      descricao: descricao || null,
      url: url || null,
      arquivo_url: arquivoUrl || null,
      login: login || null,
      senha: senha || null,
      observacao_interna: obsInterna || null,
      aplicar_automatico: aplicarAuto,
      permissao_acesso: permissao,
      ativo,
    };
    if (item) {
      await update(item.id, payload as any);
    } else {
      await create(payload as any);
    }
    setSaving(false);
    onOpenChange(false);
  };

  const tiposDoBloco = (TIPOS_POR_BLOCO[bloco] ?? []).filter((t) => t.value !== "mensagem");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? "Editar documento" : "Novo documento"}
          </DialogTitle>
          <DialogDescription>
            {escopo === "cliente"
              ? "Documento padrão para clientes — pode ser aplicado automaticamente em novos clientes."
              : "Documento interno da empresa — não é aplicado em clientes por padrão."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Escopo</Label>
            <Select value={escopo} onValueChange={(v) => setEscopo(v as DocGlobalEscopo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cliente">Documento padrão para clientes</SelectItem>
                <SelectItem value="interno">Documento interno da empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div>
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_GLOBAL_CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Bloco no cliente</Label>
            <Select value={bloco} onValueChange={(v) => setBloco(v as DocGlobalBloco)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_BLOCOS.map((b) => (
                  <SelectItem key={b} value={b}>{DOC_BLOCO_LABEL[b]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposDoBloco.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Texto explicativo que vai aparecer no cliente"
            />
          </div>

          <div className="col-span-2">
            <Label>Link / URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="col-span-2">
            <Label>URL de arquivo (opcional)</Label>
            <Input
              value={arquivoUrl}
              onChange={(e) => setArquivoUrl(e.target.value)}
              placeholder="Link para PDF, planilha, vídeo..."
            />
          </div>

          {bloco === "acessos" && (
            <>
              <div>
                <Label>Login / E-mail</Label>
                <Input value={login} onChange={(e) => setLogin(e.target.value)} />
              </div>
              <div>
                <Label>Senha</Label>
                <Input value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
            </>
          )}

          <div className="col-span-2">
            <Label>Observação interna</Label>
            <Textarea
              rows={2}
              value={obsInterna}
              onChange={(e) => setObsInterna(e.target.value)}
              placeholder="Visível apenas para a equipe (não vai para o cliente)"
            />
          </div>

          {escopo === "interno" && (
            <div className="col-span-2">
              <Label>Permissão de acesso</Label>
              <Select value={permissao} onValueChange={(v) => setPermissao(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos da equipe</SelectItem>
                  <SelectItem value="admin">Apenas administradores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="col-span-2 flex flex-wrap gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Switch
                id="aplicar_auto"
                checked={aplicarAuto}
                onCheckedChange={setAplicarAuto}
              />
              <Label htmlFor="aplicar_auto" className="cursor-pointer">
                Aplicar automaticamente em novos clientes
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
              <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !titulo.trim()}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Salvando..." : item ? "Salvar" : "Criar documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
