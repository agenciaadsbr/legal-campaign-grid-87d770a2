import { useEffect, useState } from "react";
import { useResponsabilidades, useResponsabilidadesBootstrap } from "@/store/responsabilidades";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Save } from "lucide-react";
import { toast } from "sonner";

interface Profile { id: string; email: string; nome: string | null; cargo: string | null; }

const SUGESTOES_AREAS = ["Vídeos", "Tráfego Pago", "Landing Page", "Design", "IA", "Atendimento", "CRM"];

export function ResponsabilidadesEquipeManager() {
  useResponsabilidadesBootstrap();
  const itens = useResponsabilidades((s) => s.itens);
  const upsert = useResponsabilidades((s) => s.upsert);
  const remove = useResponsabilidades((s) => s.remove);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState<string>("");

  useEffect(() => {
    supabase.from("profiles").select("id, email, nome, cargo").order("email").then(({ data }) => {
      if (data) setProfiles(data as Profile[]);
    });
  }, []);

  const atual = itens.find((i) => i.profile_id === profileId);
  const profileSel = profiles.find((p) => p.id === profileId);

  const [cargo, setCargo] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [setores, setSetores] = useState<string[]>([]);
  const [responsabilidades, setResponsabilidades] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [novoChip, setNovoChip] = useState({ area: "", skill: "", setor: "" });

  useEffect(() => {
    setCargo(atual?.cargo ?? profileSel?.cargo ?? "");
    setAreas(atual?.areas ?? []);
    setSkills(atual?.skills ?? []);
    setSetores(atual?.setores ?? []);
    setResponsabilidades(atual?.responsabilidades ?? "");
    setObservacoes(atual?.observacoes ?? "");
  }, [profileId, atual, profileSel]);

  const addChip = (k: "area" | "skill" | "setor", v: string) => {
    if (!v.trim()) return;
    if (k === "area") setAreas([...new Set([...areas, v.trim()])]);
    if (k === "skill") setSkills([...new Set([...skills, v.trim()])]);
    if (k === "setor") setSetores([...new Set([...setores, v.trim()])]);
    setNovoChip({ ...novoChip, [k]: "" });
  };

  const handleSave = async () => {
    if (!profileId) {
      toast.error("Selecione um usuário");
      return;
    }
    await upsert({
      profile_id: profileId,
      cargo: cargo || null,
      areas, skills, setores,
      responsabilidades: responsabilidades || null,
      observacoes: observacoes || null,
    });
  };

  const ChipList = ({ list, onRemove, color }: { list: string[]; onRemove: (i: number) => void; color: string }) => (
    <div className="flex flex-wrap gap-1.5">
      {list.map((c, i) => (
        <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${color}`}>
          {c}
          <button type="button" onClick={() => onRemove(i)} className="hover:opacity-70"><X className="h-3 w-3" /></button>
        </span>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader className="p-4"><CardTitle className="text-sm">Responsabilidades da Equipe</CardTitle></CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <p className="text-xs text-muted-foreground">
          Cadastre áreas, skills e setores de cada membro da equipe. Esta base prepara o sistema para sugestões automáticas de responsável.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Usuário</Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger><SelectValue placeholder="Selecione um membro..." /></SelectTrigger>
              <SelectContent>
                {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome || p.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Cargo</Label>
            <Input value={cargo} onChange={(e) => setCargo(e.target.value)} disabled={!profileId} placeholder="Editor de vídeo, Gestor..." />
          </div>
        </div>

        {profileId && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Áreas</Label>
              <ChipList list={areas} onRemove={(i) => setAreas(areas.filter((_, idx) => idx !== i))} color="bg-primary/15 text-primary" />
              <div className="flex gap-2">
                <Input value={novoChip.area} onChange={(e) => setNovoChip({ ...novoChip, area: e.target.value })} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChip("area", novoChip.area))} placeholder="Adicionar área..." className="h-8" />
                <Button size="sm" variant="ghost" onClick={() => addChip("area", novoChip.area)}><Plus className="h-3 w-3" /></Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {SUGESTOES_AREAS.filter((s) => !areas.includes(s)).map((s) => (
                  <button key={s} type="button" onClick={() => addChip("area", s)} className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-accent">+ {s}</button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Skills</Label>
              <ChipList list={skills} onRemove={(i) => setSkills(skills.filter((_, idx) => idx !== i))} color="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" />
              <div className="flex gap-2">
                <Input value={novoChip.skill} onChange={(e) => setNovoChip({ ...novoChip, skill: e.target.value })} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChip("skill", novoChip.skill))} placeholder="Adicionar skill..." className="h-8" />
                <Button size="sm" variant="ghost" onClick={() => addChip("skill", novoChip.skill)}><Plus className="h-3 w-3" /></Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Setores</Label>
              <ChipList list={setores} onRemove={(i) => setSetores(setores.filter((_, idx) => idx !== i))} color="bg-amber-500/15 text-amber-700 dark:text-amber-300" />
              <div className="flex gap-2">
                <Input value={novoChip.setor} onChange={(e) => setNovoChip({ ...novoChip, setor: e.target.value })} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChip("setor", novoChip.setor))} placeholder="Adicionar setor..." className="h-8" />
                <Button size="sm" variant="ghost" onClick={() => addChip("setor", novoChip.setor)}><Plus className="h-3 w-3" /></Button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Responsabilidades (texto livre)</Label>
              <Textarea rows={3} value={responsabilidades} onChange={(e) => setResponsabilidades(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2">
              {atual && (
                <Button variant="ghost" onClick={() => { if (confirm("Remover cadastro?")) remove(atual.id); }}>Remover</Button>
              )}
              <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
