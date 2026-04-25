import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, ShieldAlert, Link2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileRow {
  id: string;
  email: string;
  nome: string | null;
  responsavel_id: string | null;
  created_at: string;
}
interface RoleRow {
  user_id: string;
  role: AppRole;
}
interface ResponsavelRow {
  id: string;
  nome: string;
  email: string | null;
}

const ROLES: AppRole[] = ["admin", "editor", "viewer"];

export function EquipeAcessosManager() {
  const { isAdmin, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [responsaveis, setResponsaveis] = useState<ResponsavelRow[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nome: "", role: "editor" as AppRole });

  const load = async () => {
    setLoading(true);
    const [p, r, resp] = await Promise.all([
      supabase.from("profiles").select("id,email,nome,responsavel_id,created_at").order("created_at"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("responsaveis").select("id,nome,email").order("nome"),
    ]);
    setProfiles((p.data ?? []) as ProfileRow[]);
    setRoles((r.data ?? []) as RoleRow[]);
    setResponsaveis((resp.data ?? []) as ResponsavelRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
  }, [isAdmin]);

  const handleInvite = async () => {
    if (!form.email || !form.password) {
      toast.error("Email e senha são obrigatórios");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("admin-invite-user", { body: form });
    setSubmitting(false);
    if (error) {
      toast.error("Falha ao convidar", { description: error.message });
      return;
    }
    toast.success(`Usuário ${form.email} criado`);
    setDialogOpen(false);
    setForm({ email: "", password: "", nome: "", role: "editor" });
    load();
  };

  const updateRole = async (userId: string, newRole: AppRole) => {
    if (userId === user?.id) {
      toast.error("Você não pode alterar seu próprio papel");
      return;
    }
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) return toast.error(delErr.message);
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (insErr) return toast.error(insErr.message);
    toast.success("Papel atualizado");
    load();
  };

  const updateResponsavel = async (userId: string, responsavelId: string | null) => {
    const { error } = await supabase
      .from("profiles")
      .update({ responsavel_id: responsavelId })
      .eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Vínculo atualizado");
    load();
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Equipe & Acessos
          </CardTitle>
          <CardDescription>Apenas administradores podem gerenciar a equipe.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const roleOf = (uid: string): AppRole => roles.find((r) => r.user_id === uid)?.role ?? "viewer";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Equipe & Acessos</CardTitle>
          <CardDescription>Convide usuários, defina papéis e vincule à equipe</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><UserPlus className="h-4 w-4 mr-2" />Convidar usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Senha temporária</Label>
                <Input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="mín. 6 caracteres" />
              </div>
              <div className="space-y-1.5">
                <Label>Papel</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as AppRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleInvite} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum usuário ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead className="w-[140px]">Papel</TableHead>
                <TableHead className="w-[220px]"><Link2 className="h-3 w-3 inline mr-1" />Vínculo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => {
                const isMe = p.id === user?.id;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{p.nome ?? p.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.email} {isMe && <Badge variant="outline" className="ml-1 text-[10px]">você</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={roleOf(p.id)} onValueChange={(v) => updateRole(p.id, v as AppRole)} disabled={isMe}>
                        <SelectTrigger className="h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={p.responsavel_id ?? "__none__"}
                        onValueChange={(v) => updateResponsavel(p.id, v === "__none__" ? null : v)}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Nenhum —</SelectItem>
                          {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
