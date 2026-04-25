import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Loader2, ShieldAlert, Pencil, Search, Link2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface ProfileRow {
  id: string;
  email: string;
  nome: string | null;
  cargo: string | null;
  telefone: string | null;
  ativo: boolean;
  responsavel_id: string | null;
  created_at: string;
}
interface RoleRow { user_id: string; role: AppRole }
interface ResponsavelRow { id: string; nome: string; email: string | null }
interface CargoRow { id: string; label: string }

const ROLES: AppRole[] = ["admin", "editor", "viewer"];

const ROLE_BADGE: Record<AppRole, { variant: "default" | "secondary" | "outline"; label: string; className: string }> = {
  admin: { variant: "default", label: "Admin", className: "bg-primary text-primary-foreground" },
  editor: { variant: "secondary", label: "Editor", className: "" },
  viewer: { variant: "outline", label: "Viewer", className: "" },
};

const CARGO_CUSTOM = "__custom__";

export function EquipeAcessosManager() {
  const { isAdmin, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [responsaveis, setResponsaveis] = useState<ResponsavelRow[]>([]);
  const [cargos, setCargos] = useState<CargoRow[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroPapel, setFiltroPapel] = useState<AppRole | "all">("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", nome: "", cargo: "", role: "editor" as AppRole,
  });
  const [cargoModeNovo, setCargoModeNovo] = useState<"select" | "custom">("select");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [editForm, setEditForm] = useState({
    nome: "", cargo: "", telefone: "", role: "editor" as AppRole,
    responsavel_id: "__none__" as string, ativo: true,
  });
  const [cargoModeEdit, setCargoModeEdit] = useState<"select" | "custom">("select");
  const [editSaving, setEditSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, r, resp, cg] = await Promise.all([
      supabase.from("profiles").select("id,email,nome,cargo,telefone,ativo,responsavel_id,created_at").order("created_at"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("responsaveis").select("id,nome,email").order("nome"),
      supabase.from("cargos").select("id,label").order("label"),
    ]);
    setProfiles((p.data ?? []) as ProfileRow[]);
    setRoles((r.data ?? []) as RoleRow[]);
    setResponsaveis((resp.data ?? []) as ResponsavelRow[]);
    setCargos((cg.data ?? []) as CargoRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
  }, [isAdmin]);

  const roleOf = (uid: string): AppRole => roles.find((r) => r.user_id === uid)?.role ?? "viewer";

  const handleInvite = async () => {
    if (!form.email || !form.password) {
      toast.error("Email e senha são obrigatórios");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("admin-invite-user", {
      body: { email: form.email, password: form.password, nome: form.nome, role: form.role },
    });
    if (error) {
      setSubmitting(false);
      return toast.error("Falha ao convidar", { description: error.message });
    }
    if (form.cargo.trim()) {
      const { data: created } = await supabase.from("profiles").select("id").eq("email", form.email).maybeSingle();
      if (created?.id) {
        await supabase.functions.invoke("admin-update-user", {
          body: { user_id: created.id, cargo: form.cargo.trim() },
        });
      }
    }
    setSubmitting(false);
    toast.success(`Usuário ${form.email} criado`);
    setDialogOpen(false);
    setForm({ email: "", password: "", nome: "", cargo: "", role: "editor" });
    setCargoModeNovo("select");
    load();
  };

  const abrirEdicao = (p: ProfileRow) => {
    setEditing(p);
    const role = roleOf(p.id);
    setEditForm({
      nome: p.nome ?? "",
      cargo: p.cargo ?? "",
      telefone: p.telefone ?? "",
      role,
      responsavel_id: p.responsavel_id ?? "__none__",
      ativo: p.ativo,
    });
    const isInList = !p.cargo || cargos.some((c) => c.label === p.cargo);
    setCargoModeEdit(p.cargo && !isInList ? "custom" : "select");
    setEditOpen(true);
  };

  const copiarLinkAcesso = async (p: ProfileRow) => {
    const nome = p.nome?.trim() || "";
    const saudacao = nome ? `Olá, ${nome}!` : "Olá!";
    const link = `${window.location.origin}/auth`;
    const mensagem = `${saudacao} Seu acesso ao CRM da Ads BR:

🔗 Link: ${link}
📧 E-mail: ${p.email}

Use a senha definida no momento do cadastro.
Recomendamos trocar a senha no primeiro acesso.`;

    try {
      await navigator.clipboard.writeText(mensagem);
      toast.success("Link de acesso copiado!", {
        description: "Cole no WhatsApp ou e-mail do usuário.",
      });
    } catch {
      toast.error("Não foi possível copiar", {
        description: "Copie manualmente o link: " + link,
      });
    }
  };

  const salvarEdicao = async () => {
    if (!editing) return;
    setEditSaving(true);
    const { error } = await supabase.functions.invoke("admin-update-user", {
      body: {
        user_id: editing.id,
        nome: editForm.nome.trim() || null,
        cargo: editForm.cargo.trim() || null,
        telefone: editForm.telefone.trim() || null,
        role: editForm.role,
        responsavel_id: editForm.responsavel_id === "__none__" ? null : editForm.responsavel_id,
        ativo: editForm.ativo,
      },
    });
    setEditSaving(false);
    if (error) return toast.error("Falha ao salvar", { description: error.message });
    toast.success("Usuário atualizado");
    setEditOpen(false);
    setEditing(null);
    load();
  };

  const toggleAtivo = async (p: ProfileRow, novo: boolean) => {
    if (p.id === user?.id) return toast.error("Você não pode desativar a si mesmo");
    const { error } = await supabase.functions.invoke("admin-update-user", {
      body: { user_id: p.id, ativo: novo },
    });
    if (error) return toast.error("Falha", { description: error.message });
    toast.success(novo ? "Usuário ativado" : "Usuário desativado");
    load();
  };

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (filtroPapel !== "all" && roleOf(p.id) !== filtroPapel) return false;
      if (busca) {
        const q = busca.toLowerCase();
        return (p.nome ?? "").toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, roles, filtroPapel, busca]);

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

  const renderCargoField = (
    value: string,
    setValue: (v: string) => void,
    mode: "select" | "custom",
    setMode: (m: "select" | "custom") => void,
  ) => (
    mode === "select" ? (
      <Select
        value={value || "__none__"}
        onValueChange={(v) => {
          if (v === CARGO_CUSTOM) { setMode("custom"); setValue(""); }
          else setValue(v === "__none__" ? "" : v);
        }}
      >
        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— Nenhum —</SelectItem>
          {cargos.map((c) => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
          <SelectItem value={CARGO_CUSTOM}>+ Outro (digitar)</SelectItem>
        </SelectContent>
      </Select>
    ) : (
      <div className="flex gap-2">
        <Input placeholder="Digite o cargo" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button variant="outline" type="button" onClick={() => { setMode("select"); setValue(""); }}>Lista</Button>
      </div>
    )
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <div>
          <CardTitle className="text-base">Equipe & Acessos</CardTitle>
          <CardDescription>Convide, edite, ative/desative e defina permissões dos usuários</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><UserPlus className="h-4 w-4 mr-2" />Convidar usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo usuário</DialogTitle>
              <DialogDescription>O usuário poderá fazer login imediatamente com as credenciais informadas.</DialogDescription>
            </DialogHeader>
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
                <Label>Cargo</Label>
                {renderCargoField(form.cargo, (v) => setForm((f) => ({ ...f, cargo: v })), cargoModeNovo, setCargoModeNovo)}
              </div>
              <div className="space-y-1.5">
                <Label>Papel (permissão)</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as AppRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Admin: acesso total. Editor: pode criar/editar. Viewer: apenas visualizar.
                </p>
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
      <CardContent className="space-y-3">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="pl-8 h-9"
            />
          </div>
          <Select value={filtroPapel} onValueChange={(v) => setFiltroPapel(v as AppRole | "all")}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os papéis</SelectItem>
              {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum usuário encontrado.</p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead className="w-[110px]">Ativo</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const isMe = p.id === user?.id;
                  const role = roleOf(p.id);
                  const badge = ROLE_BADGE[role];
                  const responsavel = responsaveis.find((r) => r.id === p.responsavel_id);
                  return (
                    <TableRow key={p.id} className={!p.ativo ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          {p.nome ?? p.email}
                          {isMe && <Badge variant="outline" className="text-[10px]">você</Badge>}
                          {!p.ativo && <Badge variant="outline" className="text-[10px] border-destructive/50 text-destructive">inativo</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{p.email}</div>
                      </TableCell>
                      <TableCell className="text-sm">{p.cargo ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant} className={badge.className}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {responsavel?.nome ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={p.ativo}
                          onCheckedChange={(v) => toggleAtivo(p, v)}
                          disabled={isMe}
                        />
                      </TableCell>
                      <TableCell>
                        <TooltipProvider delayDuration={200}>
                          <div className="flex items-center gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copiarLinkAcesso(p)}>
                                  <Link2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar link de acesso</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => abrirEdicao(p)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar usuário</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>{editing?.email}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={editForm.nome} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                {renderCargoField(editForm.cargo, (v) => setEditForm((f) => ({ ...f, cargo: v })), cargoModeEdit, setCargoModeEdit)}
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={editForm.telefone} onChange={(e) => setEditForm((f) => ({ ...f, telefone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Papel (permissão)</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as AppRole }))}
                  disabled={editing.id === user?.id}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                {editing.id === user?.id && (
                  <p className="text-[11px] text-muted-foreground">Você não pode alterar seu próprio papel.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Vínculo (responsável)</Label>
                <Select
                  value={editForm.responsavel_id}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, responsavel_id: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhum —</SelectItem>
                    {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <div className="text-sm font-medium">Conta ativa</div>
                  <div className="text-xs text-muted-foreground">Inativa = login bloqueado</div>
                </div>
                <Switch
                  checked={editForm.ativo}
                  onCheckedChange={(v) => setEditForm((f) => ({ ...f, ativo: v }))}
                  disabled={editing.id === user?.id}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={editSaving}>
              {editSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
