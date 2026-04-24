import { useCRM } from "@/store/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function CamposPersonalizados() {
  const { customFields, addCustomField, deleteCustomField } = useCRM();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ escopo: "cliente" as "cliente" | "post", nome: "", tipo: "texto" as any });
  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campos Personalizados</h1>
          <p className="text-sm text-muted-foreground">Estenda Clientes e Posts com campos próprios</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar Campo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Campo</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Escopo</Label>
                  <Select value={form.escopo} onValueChange={(v) => setForm({ ...form, escopo: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="post">Post</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="texto">Texto</SelectItem>
                      <SelectItem value="numero">Número</SelectItem>
                      <SelectItem value="data">Data</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => { if (!form.nome) return; addCustomField(form); setOpen(false); setForm({ escopo: "cliente", nome: "", tipo: "texto" }); }}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg bg-card divide-y">
        {customFields.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Nenhum campo personalizado ainda</div>}
        {customFields.map((f) => (
          <div key={f.id} className="flex items-center px-4 py-3 gap-3">
            <div className="flex-1">
              <div className="font-medium text-sm">{f.nome}</div>
              <div className="text-xs text-muted-foreground">{f.escopo} · {f.tipo}</div>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteCustomField(f.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
