import { useCRM, Permissao } from "@/store/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const cores = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#a855f7", "#ef4444", "#3b82f6"];

export function ResponsaveisEditor() {
  const { responsaveis, addResponsavel, updateResponsavel, deleteResponsavel } = useCRM();
  const [form, setForm] = useState({ nome: "", email: "", cor: cores[0], permissao: "editor" as Permissao });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", email: "", cor: cores[0], permissao: "editor" as Permissao });

  const adicionar = () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome");
      return;
    }
    addResponsavel(form);
    setForm({ nome: "", email: "", cor: cores[0], permissao: "editor" });
    toast.success("Responsável adicionado");
  };

  const iniciarEdicao = (r: typeof responsaveis[number]) => {
    setEditId(r.id);
    setEditForm({ nome: r.nome, email: r.email, cor: r.cor, permissao: r.permissao });
  };
  const salvarEdicao = () => {
    if (!editId) return;
    if (!editForm.nome.trim()) {
      toast.error("Nome não pode ficar vazio");
      return;
    }
    updateResponsavel(editId, editForm);
    setEditId(null);
    toast.success("Responsável atualizado");
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {responsaveis.map((r) => {
          if (editId === r.id) {
            return (
              <div key={r.id} className="border rounded-md p-3 space-y-2 bg-card">
                <div className="flex gap-2">
                  <Input
                    value={editForm.nome}
                    onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                    placeholder="Nome"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="Email"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    {cores.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, cor: c })}
                        className={`h-6 w-6 rounded-full ring-2 ${editForm.cor === c ? "ring-foreground" : "ring-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <Select value={editForm.permissao} onValueChange={(v) => setEditForm({ ...editForm, permissao: v as Permissao })}>
                    <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1" />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={salvarEdicao} title="Salvar">
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(null)} title="Cancelar">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          }
          return (
            <div key={r.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
              <div
                className="h-8 w-8 rounded-full text-white text-xs font-semibold flex items-center justify-center shrink-0"
                style={{ backgroundColor: r.cor }}
              >
                {r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.nome}</div>
                <div className="text-[11px] text-muted-foreground truncate">{r.email || "—"}</div>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-primary px-1.5 py-0.5 rounded bg-primary/10">
                {r.permissao}
              </span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => iniciarEdicao(r)} title="Editar">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Remover">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover “{r.nome}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O responsável será removido de todos os clientes onde estava atribuído.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        deleteResponsavel(r.id);
                        toast.success("Responsável removido");
                      }}
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        })}
        {responsaveis.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4">Nenhum responsável cadastrado</div>
        )}
      </div>

      <div className="border-t pt-3 space-y-2">
        <Label className="text-xs">Adicionar responsável</Label>
        <div className="flex gap-2">
          <Input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome"
            className="h-9 text-sm"
          />
          <Input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email (opcional)"
            className="h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {cores.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, cor: c })}
                className={`h-6 w-6 rounded-full ring-2 ${form.cor === c ? "ring-foreground" : "ring-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <Select value={form.permissao} onValueChange={(v) => setForm({ ...form, permissao: v as Permissao })}>
            <SelectTrigger className="h-9 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button onClick={adicionar} className="gap-1 h-9">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}
