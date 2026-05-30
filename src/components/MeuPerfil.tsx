import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCRM } from "@/store/crm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Upload, User, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Cargo { id: string; label: string }

export function MeuPerfil() {
  const { user } = useAuth();
  const reloadCRM = useCRM((s) => s._loadAll);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [form, setForm] = useState({ nome: "", cargo: "", telefone: "", avatar_url: "" });
  const [cargoMode, setCargoMode] = useState<"select" | "custom">("select");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, c] = await Promise.all([
        supabase.from("profiles").select("nome,cargo,telefone,avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("cargos").select("id,label").order("label"),
      ]);
      const profile = p.data ?? { nome: "", cargo: "", telefone: "", avatar_url: "" };
      const cargosList = (c.data ?? []) as Cargo[];
      setCargos(cargosList);
      setForm({
        nome: profile.nome ?? "",
        cargo: profile.cargo ?? "",
        telefone: profile.telefone ?? "",
        avatar_url: profile.avatar_url ?? "",
      });
      const isInList = cargosList.some((cg) => cg.label === profile.cargo);
      setCargoMode(profile.cargo && !isInList ? "custom" : "select");
      setLoading(false);
    })();
  }, [user]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!user || !event.target.files || event.target.files.length === 0) return;
      setUploading(true);
      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Propaga foto para o responsável vinculado (aparece em cards/ícones do sistema)
      const { data: prof } = await supabase
        .from("profiles")
        .select("responsavel_id")
        .eq("id", user.id)
        .maybeSingle();
      if (prof?.responsavel_id) {
        await supabase
          .from("responsaveis")
          .update({ avatar_url: publicUrl })
          .eq("id", prof.responsavel_id);
      }

      setForm((f) => ({ ...f, avatar_url: publicUrl }));
      // Recarrega o store global para refletir a nova foto em toda a UI
      try { await reloadCRM(); } catch {}
      toast.success("Foto de perfil atualizada!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer upload da imagem");
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      if (!user) return;
      setUploading(true);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      const { data: prof } = await supabase
        .from("profiles")
        .select("responsavel_id")
        .eq("id", user.id)
        .maybeSingle();
      if (prof?.responsavel_id) {
        await supabase
          .from("responsaveis")
          .update({ avatar_url: null })
          .eq("id", prof.responsavel_id);
      }

      setForm((f) => ({ ...f, avatar_url: "" }));
      try { await reloadCRM(); } catch {}
      toast.success("Foto de perfil removida");
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover imagem");
    } finally {
      setUploading(false);
    }
  };

  const salvar = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nome: form.nome.trim() || null,
        cargo: form.cargo.trim() || null,
        telefone: form.telefone.trim() || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meu perfil</CardTitle>
        <CardDescription>Atualize suas informações pessoais</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 max-w-md">
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-2 border-muted">
              <AvatarImage src={form.avatar_url} />
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {form.nome ? form.nome.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              id="avatar-upload"
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
              ref={fileInputRef}
              disabled={uploading}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
              {form.avatar_url ? "Alterar foto" : "Adicionar foto"}
            </Button>
            {form.avatar_url && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={uploading}
                onClick={removeAvatar}
              >
                <X className="h-3 w-3" />
                Remover
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Cargo</Label>
            {cargoMode === "select" ? (
              <Select
                value={form.cargo || "__none__"}
                onValueChange={(v) => {
                  if (v === "__custom__") {
                    setCargoMode("custom");
                    setForm((f) => ({ ...f, cargo: "" }));
                  } else {
                    setForm((f) => ({ ...f, cargo: v === "__none__" ? "" : v }));
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {cargos.map((c) => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
                  <SelectItem value="__custom__">+ Outro (digitar)</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Digite o cargo"
                  value={form.cargo}
                  onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                />
                <Button variant="outline" type="button" onClick={() => { setCargoMode("select"); setForm((f) => ({ ...f, cargo: "" })); }}>
                  Lista
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input
              placeholder="(11) 99999-9999"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            />
          </div>
        </div>
        <Button onClick={salvar} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </CardContent>
      <SegurancaContaSection />
    </Card>
  );
}

function SegurancaContaSection() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChangePassword = async () => {
    if (!user?.email) return;
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSubmitting(true);
    // Valida senha atual reautenticando
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInErr) {
      setSubmitting(false);
      toast.error("Senha atual incorreta");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);
    if (error) {
      toast.error("Falha ao atualizar senha", { description: error.message });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Senha atualizada com sucesso.");
  };

  return (
    <CardContent className="space-y-4 max-w-md border-t pt-6">
      <div>
        <h3 className="text-sm font-semibold">Segurança da conta</h3>
        <p className="text-xs text-muted-foreground">Altere a sua senha de acesso</p>
      </div>
      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label>Senha atual</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Nova senha</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Confirmar nova senha</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
          />
        </div>
      </div>
      <Button
        onClick={handleChangePassword}
        disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
        className="gap-2"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Atualizar senha
      </Button>
    </CardContent>
  );
}
