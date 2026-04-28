import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DOC_TIPO_LABEL,
  DOC_TIPOS,
  DocTipo,
  DocumentacaoItem,
  useDocumentacao,
} from "@/store/documentacao";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: string;
  /** Quando passado, edita; senão cria. */
  item?: DocumentacaoItem | null;
}

export function DocumentacaoItemDialog({ open, onOpenChange, clienteId, item }: Props) {
  const create = useDocumentacao((s) => s.create);
  const update = useDocumentacao((s) => s.update);

  const [tipo, setTipo] = useState<DocTipo>("outro");
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTipo((item?.tipo as DocTipo) ?? "outro");
      setTitulo(item?.titulo ?? "");
      setUrl(item?.url ?? "");
      setLogin(item?.login ?? "");
      setSenha(item?.senha ?? "");
      setObservacao(item?.observacao ?? "");
    }
  }, [open, item]);

  const submit = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    if (item) {
      await update(item.id, {
        tipo,
        titulo: titulo.trim(),
        url: url || null,
        login: login || null,
        senha: senha || null,
        observacao: observacao || null,
      });
    } else {
      await create({
        cliente_id: clienteId,
        tipo,
        titulo: titulo.trim(),
        url: url || null,
        login: login || null,
        senha: senha || null,
        observacao: observacao || null,
      });
    }
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Editar item" : "Adicionar item de documentação"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as DocTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>{DOC_TIPO_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>URL / Link</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Login / E-mail</Label>
            <Input value={login} onChange={(e) => setLogin(e.target.value)} />
          </div>
          <div>
            <Label>Senha</Label>
            <Input value={senha} onChange={(e) => setSenha(e.target.value)} type="text" />
          </div>
          <div className="col-span-2">
            <Label>Observação</Label>
            <Textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !titulo.trim()}>
            {saving ? "Salvando..." : item ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
