import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface Cargo { id: string; label: string }

export function MeuPerfil() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [form, setForm] = useState({ nome: "", cargo: "", telefone: "" });
  const [cargoMode, setCargoMode] = useState<"select" | "custom">("select");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, c] = await Promise.all([
        supabase.from("profiles").select("nome,cargo,telefone").eq("id", user.id).maybeSingle(),
        supabase.from("cargos").select("id,label").order("label"),
      ]);
      const profile = p.data ?? { nome: "", cargo: "", telefone: "" };
      const cargosList = (c.data ?? []) as Cargo[];
      setCargos(cargosList);
      setForm({
        nome: profile.nome ?? "",
        cargo: profile.cargo ?? "",
        telefone: profile.telefone ?? "",
      });
      const isInList = cargosList.some((cg) => cg.label === profile.cargo);
      setCargoMode(profile.cargo && !isInList ? "custom" : "select");
      setLoading(false);
    })();
  }, [user]);

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
      <CardContent className="space-y-4 max-w-md">
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
        <Button onClick={salvar} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
