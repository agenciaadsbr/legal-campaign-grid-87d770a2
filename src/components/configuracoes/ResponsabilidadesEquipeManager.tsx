import { useEffect, useState } from "react";
import { useResponsabilidades, useResponsabilidadesBootstrap, Responsabilidade } from "@/store/responsabilidades";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Trash2, User, Briefcase, Target, Cpu, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Profile { id: string; email: string; nome: string | null; cargo: string | null; }

const OPCOES_PARTICIPACAO = [
  "Executor principal", "Apoio técnico", "Supervisor", "Validador", 
  "Atendimento ao cliente", "Estratégico", "Administrativo", "Comercial"
];

const OPCOES_SETORES = [
  "Tráfego", "Design", "Vídeo", "Web / Landing Pages", "CRM", "IA / Automação", 
  "Relatórios", "Saldos", "Comercial", "Atendimento", "Gestão de Projetos", 
  "Financeiro", "Administrativo", "Social Media", "Suporte Técnico", "Reuniões de Performance"
];

const COLABORADORES_PADRAO = [
  { nome: "Greice", cargo: "Gestora de Tráfego" },
  { nome: "Pablo", cargo: "Agendamento e Postagens" },
  { nome: "Dalton", cargo: "Relatórios, Saldos e Estruturas" },
  { nome: "Bianca", cargo: "Editora de Vídeo e Vídeos com IA" },
  { nome: "Bruno", cargo: "Web Designer / Landing Pages" },
  { nome: "Thauana / Flor", cargo: "SDR e Agendamento" },
  { nome: "Lorenzo", cargo: "Designer" },
  { nome: "Erick", cargo: "Gerente de Projetos / Apoio Técnico / Tráfego" },
  { nome: "Tales", cargo: "Reuniões de Performance e Apresentação" },
  { nome: "Cristiano", cargo: "Performance, Apresentação, Financeiro e Administrativo" },
  { nome: "Robson", cargo: "Gestor de Projetos" }
];

export function ResponsabilidadesEquipeManager() {
  useResponsabilidadesBootstrap();
  const itens = useResponsabilidades((s) => s.itens);
  const upsert = useResponsabilidades((s) => s.upsert);
  const remove = useResponsabilidades((s) => s.remove);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState<string>("");

  // Form states
  const [formData, setFormData] = useState<Partial<Responsabilidade>>({
    status: 'ativo',
    prioridade_padrao: 'Média',
    regras_atribuicao: {
      executor_padrao: true,
      pode_ser_supervisor: false,
      pode_ser_apoio: true,
      recebe_urgentes: true,
      recebe_reuniao: true,
      recebe_whatsapp: true,
      recebe_internas: true,
      recebe_clientes: true
    }
  });

  useEffect(() => {
    supabase.from("profiles").select("id, email, nome, cargo").order("email").then(({ data }) => {
      if (data) setProfiles(data as Profile[]);
    });
  }, []);

  const atual = itens.find((i) => i.profile_id === profileId);
  const profileSel = profiles.find((p) => p.id === profileId);

  useEffect(() => {
    if (profileId) {
      if (atual) {
        // Migrate/sync old tag fields to new text fields if needed
        const newSetoresTexto = (atual.setores_areas_texto || atual.areas?.join(", ") || "");
        const newSkillsTexto = (atual.skills_competencias_texto || atual.skills?.join(", ") || "");
        const newSetoresCompativeis = (atual.setores_compativeis || atual.setores || []);

        setFormData({
          ...atual,
          cargo: atual.cargo ?? profileSel?.cargo ?? "",
          setores_areas_texto: newSetoresTexto,
          skills_competencias_texto: newSkillsTexto,
          setores_compativeis: newSetoresCompativeis,
          status: atual.status || 'ativo',
          prioridade_padrao: atual.prioridade_padrao || 'Média',
          regras_atribuicao: (atual.regras_atribuicao as any) || {
            executor_padrao: true,
            pode_ser_supervisor: false,
            pode_ser_apoio: true,
            recebe_urgentes: true,
            recebe_reuniao: true,
            recebe_whatsapp: true,
            recebe_internas: true,
            recebe_clientes: true
          }
        });
      } else {
        setFormData({
          profile_id: profileId,
          cargo: profileSel?.cargo ?? "",
          status: 'ativo',
          prioridade_padrao: 'Média',
          regras_atribuicao: {
            executor_padrao: true,
            pode_ser_supervisor: false,
            pode_ser_apoio: true,
            recebe_urgentes: true,
            recebe_reuniao: true,
            recebe_whatsapp: true,
            recebe_internas: true,
            recebe_clientes: true
          }
        });
      }
    }
  }, [profileId, atual, profileSel]);

  const handleInputChange = (field: keyof Responsabilidade, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegraChange = (field: string, value: boolean) => {
    const currentRegras = (formData.regras_atribuicao as any) || {};
    setFormData(prev => ({
      ...prev,
      regras_atribuicao: { ...currentRegras, [field]: value }
    }));
  };

  const toggleArrayItem = (field: 'tipos_participacao' | 'setores_compativeis', value: string) => {
    const current = (formData[field] as string[]) || [];
    const updated = current.includes(value) 
      ? current.filter(item => item !== value)
      : [...current, value];
    handleInputChange(field, updated);
  };

  const handleSave = async () => {
    if (!profileId) {
      toast.error("Selecione um usuário");
      return;
    }
    await upsert({
      ...formData,
      profile_id: profileId,
    } as any);
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Ficha de Responsabilidades Operacionais
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Base de conhecimento para atribuição automática de tarefas pela IA.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger className="w-full md:w-[250px] bg-background">
                <SelectValue placeholder="Selecione um colaborador..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome || p.email} {itens.find(i => i.profile_id === p.id) ? "✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {profileId && (
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" /> Salvar Ficha
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {!profileId ? (
          <div className="bg-muted/30 border-2 border-dashed rounded-xl p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-muted-foreground">Selecione um usuário para configurar</h3>
            <p className="text-sm text-muted-foreground/70 max-w-md mx-auto mt-2">
              Escolha um membro da equipe acima para definir suas responsabilidades, skills e regras de acionamento por IA.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {COLABORADORES_PADRAO.map(c => (
                <span key={c.nome} className="text-[10px] px-2 py-1 bg-background border rounded-full text-muted-foreground">
                  {c.nome}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Accordion type="multiple" defaultValue={["identificacao", "atuacao", "regras_ia"]} className="space-y-4">
              
              {/* CARD 1 - Identificação */}
              <AccordionItem value="identificacao" className="border rounded-xl bg-background overflow-hidden px-4 py-1">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-semibold text-base">CARD 1 - Identificação</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Cargo</Label>
                      <Input 
                        value={formData.cargo || ""} 
                        onChange={(e) => handleInputChange('cargo', e.target.value)} 
                        placeholder="Ex: Gestor de Tráfego" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Status do Colaborador</Label>
                      <Select 
                        value={formData.status || 'ativo'} 
                        onValueChange={(v) => handleInputChange('status', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Supervisor Padrão</Label>
                      <Select 
                        value={formData.supervisor_padrao_id || "none"} 
                        onValueChange={(v) => handleInputChange('supervisor_padrao_id', v === "none" ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {profiles.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.nome || p.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Função Principal</Label>
                    <Input 
                      value={formData.funcao_principal || ""} 
                      onChange={(e) => handleInputChange('funcao_principal', e.target.value)} 
                      placeholder="Descrição curta da função estratégica" 
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* CARD 2 - Atuação */}
              <AccordionItem value="atuacao" className="border rounded-xl bg-background overflow-hidden px-4 py-1">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Briefcase className="h-5 w-5 text-emerald-600" />
                    </div>
                    <span className="font-semibold text-base">CARD 2 - Atuação</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Setores e áreas de atuação</Label>
                    <p className="text-[10px] text-muted-foreground mb-1">Pode colar uma lista separada por vírgulas.</p>
                    <Textarea 
                      rows={3} 
                      value={formData.setores_areas_texto || ""} 
                      onChange={(e) => handleInputChange('setores_areas_texto', e.target.value)} 
                      placeholder="Ex: Tráfego Pago, Performance, Meta Ads, Google Ads..." 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Skills e competências</Label>
                    <Textarea 
                      rows={3} 
                      value={formData.skills_competencias_texto || ""} 
                      onChange={(e) => handleInputChange('skills_competencias_texto', e.target.value)} 
                      placeholder="Habilidades técnicas, operacionais e comportamentais" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Ferramentas utilizadas</Label>
                    <Textarea 
                      rows={2} 
                      value={formData.ferramentas_utilizadas || ""} 
                      onChange={(e) => handleInputChange('ferramentas_utilizadas', e.target.value)} 
                      placeholder="Ex: Meta Ads, Google Analytics, CRM, Google Sheets..." 
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* CARD 3 - Responsabilidades */}
              <AccordionItem value="responsabilidades" className="border rounded-xl bg-background overflow-hidden px-4 py-1">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Target className="h-5 w-5 text-amber-600" />
                    </div>
                    <span className="font-semibold text-base">CARD 3 - Responsabilidades</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Responsabilidades fixas</Label>
                    <Textarea 
                      rows={3} 
                      value={formData.responsabilidades_fixas || ""} 
                      onChange={(e) => handleInputChange('responsabilidades_fixas', e.target.value)} 
                      placeholder="O que a pessoa faz de forma recorrente na operação" 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Tarefas diárias</Label>
                      <Textarea 
                        rows={3} 
                        value={formData.tarefas_diarias || ""} 
                        onChange={(e) => handleInputChange('tarefas_diarias', e.target.value)} 
                        placeholder="Tarefas comuns do dia a dia" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Tarefas semanais</Label>
                      <Textarea 
                        rows={3} 
                        value={formData.tarefas_semanais || ""} 
                        onChange={(e) => handleInputChange('tarefas_semanais', e.target.value)} 
                        placeholder="Tarefas recorrentes por semana" 
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* CARD 4 - Regras para IA */}
              <AccordionItem value="regras_ia" className="border rounded-xl bg-background overflow-hidden px-4 py-1">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Cpu className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="font-semibold text-base">CARD 4 - Regras para IA (Cérebro do Sistema)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-4">
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4 mb-4">
                    <p className="text-xs text-purple-700 dark:text-purple-300 font-medium leading-relaxed">
                      Estes campos são fundamentais para que a IA identifique corretamente quem deve realizar cada tarefa identificada nas reuniões.
                    </p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Demandas que a IA deve atribuir para este usuário</Label>
                    <Textarea 
                      rows={3} 
                      value={formData.demandas_ia || ""} 
                      onChange={(e) => handleInputChange('demandas_ia', e.target.value)} 
                      placeholder="Ex: Criar campanha no Meta Ads, otimizar campanha, analisar custo por lead..." 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Palavras-chave de acionamento da IA</Label>
                      <Textarea 
                        rows={3} 
                        value={formData.palavras_chave_ia || ""} 
                        onChange={(e) => handleInputChange('palavras_chave_ia', e.target.value)} 
                        placeholder="tráfego, campanha, Meta Ads, leads, conversas, WhatsApp..." 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Observações para IA</Label>
                      <Textarea 
                        rows={3} 
                        value={formData.observacoes_ia || ""} 
                        onChange={(e) => handleInputChange('observacoes_ia', e.target.value)} 
                        placeholder="Instruções específicas para a IA sobre como usar esse colaborador" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Quando acionar este responsável</Label>
                      <Textarea 
                        rows={3} 
                        value={formData.quando_acionar || ""} 
                        onChange={(e) => handleInputChange('quando_acionar', e.target.value)} 
                        placeholder="Explique em linguagem natural quando sugerir esta pessoa" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-rose-600 dark:text-rose-400">Quando NÃO acionar este responsável</Label>
                      <Textarea 
                        rows={3} 
                        value={formData.quando_nao_acionar || ""} 
                        onChange={(e) => handleInputChange('quando_nao_acionar', e.target.value)} 
                        placeholder="Evite atribuições erradas (ex: não acionar para design)" 
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* CARD 5 - Prazos e prioridade */}
              <AccordionItem value="prazos" className="border rounded-xl bg-background overflow-hidden px-4 py-1">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                      <Clock className="h-5 w-5 text-cyan-600" />
                    </div>
                    <span className="font-semibold text-base">CARD 5 - Prazos e Prioridade</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Prioridade padrão</Label>
                        <Select 
                          value={formData.prioridade_padrao || 'Média'} 
                          onValueChange={(v) => handleInputChange('prioridade_padrao', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Baixa">Baixa</SelectItem>
                            <SelectItem value="Média">Média</SelectItem>
                            <SelectItem value="Alta">Alta</SelectItem>
                            <SelectItem value="Urgente">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Regras de prioridade</Label>
                        <Textarea 
                          rows={3} 
                          value={formData.regras_prioridade || ""} 
                          onChange={(e) => handleInputChange('regras_prioridade', e.target.value)} 
                          placeholder="Ex: Alta quando envolver campanha sem resultado ou custo alto" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Prazo padrão sugerido</Label>
                      <Textarea 
                        rows={5} 
                        value={formData.prazo_padrao_sugerido || ""} 
                        onChange={(e) => handleInputChange('prazo_padrao_sugerido', e.target.value)} 
                        placeholder="Ex: Ajuste simples: mesmo dia. Nova campanha: 1 a 3 dias." 
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* CARD 6 - Entregáveis e checklist */}
              <AccordionItem value="entregaveis" className="border rounded-xl bg-background overflow-hidden px-4 py-1">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="font-semibold text-base">CARD 6 - Entregáveis e Checklist</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Entregáveis esperados</Label>
                    <Textarea 
                      rows={3} 
                      value={formData.entregaveis_esperados || ""} 
                      onChange={(e) => handleInputChange('entregaveis_esperados', e.target.value)} 
                      placeholder="Ex: Campanha criada, Diagnóstico registrado, Solicitação de criativos feita..." 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Checklist padrão para tarefas deste usuário</Label>
                    <Textarea 
                      rows={5} 
                      value={formData.checklist_padrao || ""} 
                      onChange={(e) => handleInputChange('checklist_padrao', e.target.value)} 
                      placeholder="- Conferir briefing&#10;- Aplicar identidade visual&#10;- Exportar no formato correto" 
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* CARD 7 - Atribuição automática */}
              <AccordionItem value="atribuicao" className="border rounded-xl bg-background overflow-hidden px-4 py-1">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-500/10 rounded-lg">
                      <Target className="h-5 w-5 text-slate-600" />
                    </div>
                    <span className="font-semibold text-base">CARD 7 - Atribuição Automática</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Participação</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {OPCOES_PARTICIPACAO.map(opcao => (
                          <div key={opcao} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`participacao-${opcao}`} 
                              checked={(formData.tipos_participacao || []).includes(opcao)}
                              onCheckedChange={() => toggleArrayItem('tipos_participacao', opcao)}
                            />
                            <label htmlFor={`participacao-${opcao}`} className="text-sm cursor-pointer">{opcao}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Setores de tarefa compatíveis</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {OPCOES_SETORES.map(setor => (
                          <div key={setor} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`setor-${setor}`} 
                              checked={(formData.setores_compativeis || []).includes(setor)}
                              onCheckedChange={() => toggleArrayItem('setores_compativeis', setor)}
                            />
                            <label htmlFor={`setor-${setor}`} className="text-sm cursor-pointer whitespace-nowrap">{setor}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 block">Regras de Atribuição Automática</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { key: 'executor_padrao', label: 'Responsável executor padrão' },
                        { key: 'pode_ser_supervisor', label: 'Pode ser supervisor' },
                        { key: 'pode_ser_apoio', label: 'Pode ser apoio técnico' },
                        { key: 'recebe_urgentes', label: 'Recebe tarefas urgentes' },
                        { key: 'recebe_reuniao', label: 'Recebe tarefas de reunião' },
                        { key: 'recebe_whatsapp', label: 'Recebe tarefas de WhatsApp' },
                        { key: 'recebe_internas', label: 'Recebe tarefas internas' },
                        { key: 'recebe_clientes', label: 'Recebe tarefas de clientes' }
                      ].map(regra => (
                        <div key={regra.key} className="flex items-center space-x-2 bg-muted/30 p-2 rounded-lg border border-transparent hover:border-muted-foreground/20 transition-colors">
                          <Checkbox 
                            id={`regra-${regra.key}`} 
                            checked={!!(formData.regras_atribuicao as any)?.[regra.key]}
                            onCheckedChange={(checked) => handleRegraChange(regra.key, !!checked)}
                          />
                          <label htmlFor={`regra-${regra.key}`} className="text-xs font-medium cursor-pointer leading-tight">{regra.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex gap-2">
                {atual && (
                  <Button 
                    variant="outline" 
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => { if (confirm("Remover permanentemente esta ficha de responsabilidades?")) remove(atual.id); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Remover Cadastro
                  </Button>
                )}
              </div>
              <Button size="lg" onClick={handleSave} className="gap-2 px-8">
                <Save className="h-5 w-5" /> Salvar Ficha de Responsabilidades
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
