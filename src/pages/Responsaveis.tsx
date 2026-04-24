import { useCRM, Permissao } from "@/store/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const cores = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#a855f7", "#ef4444", "#3b82f6"];

export default function Responsaveis() {
  const { responsaveis, addResponsavel, deleteResponsavel, updateResponsavel } = useCRM();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", cor: cores[0], permissao: "editor" as Permissao });

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Responsáveis</h1>
          <p className="text-sm text-muted-foreground">{responsaveis.length} membros</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Responsável</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div>
                <Label>Cor</Label>
                <div className="flex gap-2 mt-1">
                  {cores.map((c) => (
                    <button key={c} onClick={() => setForm({ ...form, cor: c })} className={`h-7 w-7 rounded-full ring-2 ${form.cor === c ? "ring-foreground" : "ring-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <Label>Permissão</Label>
                <Select value={form.permissao} onValueChange={(v) => setForm({ ...form, permissao: v as Permissao })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => { if (!form.nome) return; addResponsavel(form); setOpen(false); setForm({ nome: "", email: "", cor: cores[0], permissao: "editor" }); }}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {responsaveis.map((r) => (
          <div key={r.id} className="border rounded-lg bg-card p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full text-white text-base font-semibold flex items-center justify-center" style={{ backgroundColor: r.cor }}>
              {r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{r.nome}</div>
              <div className="text-xs text-muted-foreground truncate">{r.email}</div>
              <div className="text-[10px] uppercase tracking-wide text-primary mt-0.5">{r.permissao}</div>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteResponsavel(r.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
