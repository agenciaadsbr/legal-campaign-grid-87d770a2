import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCRM } from "@/store/crm";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Upload, X } from "lucide-react";
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

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      const { data: prof } = await supabase
        .from("profiles")
        .select("responsavel_id")
        .eq("id", user.id)
        .maybeSingle();
      if (prof?.responsavel_id) {
        await supabase.from("responsaveis").update({ avatar_url: publicUrl }).eq("id", prof.responsavel_id);
      }

      setForm((f) => ({ ...f, avatar_url: publicUrl }));
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
        await supabase.from("responsaveis").update({ avatar_url: null }).eq("id", prof.responsavel_id);
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
      <CardContent className="p-4">
        <div className="grid gap-4 md:grid-cols-[minmax(220px,35%)_1fr]">
          {/* Coluna Esquerda: Avatar + identidade */}
          <div className="flex flex-col items-center text-center gap-3 p-3 rounded-lg border bg-muted/30">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                <AvatarImage src={form.avatar_url} />
                <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                  {form.nome ? form.nome.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <input
              type="file"
              id="avatar-upload"
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
              ref={fileInputRef}
              disabled={uploading}
            />
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3 w-3" />
                {form.avatar_url ? "Alterar" : "Adicionar"}
              </Button>
              {form.avatar_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={uploading}
                  onClick={removeAvatar}
                >
                  <X className="h-3 w-3" />
                  Remover
                </Button>
              )}
            </div>
            <div className="w-full space-y-0.5 pt-1 border-t">
              <div className="text-sm font-semibold truncate">{form.nome || "—"}</div>
              <div className="text-xs text-muted-foreground truncate">{form.cargo || "Sem cargo"}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>

          {/* Coluna Direita: Dados pessoais + Segurança */}
          <div className="space-y-4">
            <section>
              <h3 className="text-sm font-semibold mb-2">Dados pessoais</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    className="h-9"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cargo</Label>
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
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Nenhum —</SelectItem>
                        {cargos.map((c) => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
                        <SelectItem value="__custom__">+ Outro (digitar)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-1.5">
                      <Input
                        className="h-9"
                        placeholder="Digite o cargo"
                        value={form.cargo}
                        onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                        type="button"
                        onClick={() => { setCargoMode("select"); setForm((f) => ({ ...f, cargo: "" })); }}
                      >
                        Lista
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telefone</Label>
                  <Input
                    className="h-9"
                    placeholder="(11) 99999-9999"
                    value={form.telefone}
                    onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input className="h-9" value={user?.email ?? ""} disabled />
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <Button onClick={salvar} disabled={saving} size="sm" className="gap-2 h-8">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Salvar
                </Button>
              </div>
            </section>

            <div className="border-t" />

            <SegurancaContaSection />
          </div>
        </div>
      </CardContent>
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
    <section>
      <div className="mb-2">
        <h3 className="text-sm font-semibold">Segurança da conta</h3>
        <p className="text-xs text-muted-foreground">Altere a sua senha de acesso</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Senha atual</Label>
          <Input
            className="h-9"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nova senha</Label>
          <Input
            className="h-9"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Confirmar nova senha</Label>
          <Input
            className="h-9"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
          />
        </div>
        <div className="flex items-end justify-end">
          <Button
            onClick={handleChangePassword}
            disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
            size="sm"
            className="gap-2 h-9 w-full sm:w-auto"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Atualizar senha
          </Button>
        </div>
      </div>
    </section>
  );
}
