import { useMemo, useRef, useState } from "react";
import { useCRM } from "@/store/crm";
import { CentralAtivacaoHeader } from "@/components/ativacao/CentralAtivacaoHeader";
import { CentralAtivacaoKpis } from "@/components/ativacao/CentralAtivacaoKpis";
import {
  CentralAtivacaoFiltros, FILTROS_VAZIOS, type AtivacaoFiltros,
} from "@/components/ativacao/CentralAtivacaoFiltros";
import { CentralAtivacaoTable } from "@/components/ativacao/CentralAtivacaoTable";
import { RegrasAtivacaoDialog } from "@/components/ativacao/RegrasAtivacaoDialog";
import { ImportarClientesDialog } from "@/components/ativacao/ImportarClientesDialog";
import { MarcarAtivoDialog } from "@/components/ativacao/MarcarAtivoDialog";
import { DetalheClienteAtivacao } from "@/components/ativacao/DetalheClienteAtivacao";
import { MetaAtivacaoCard } from "@/components/ativacao/cards/MetaAtivacaoCard";
import { LegendaStatusCard } from "@/components/ativacao/cards/LegendaStatusCard";
import { AlertaResponsavelCard } from "@/components/ativacao/cards/AlertaResponsavelCard";
import { AtivacoesRiscoCard } from "@/components/ativacao/cards/AtivacoesRiscoCard";
import { useAtivacaoRegras } from "@/hooks/useAtivacaoRegras";
import { useOnboardingAgregado, type AtivacaoLinha } from "@/hooks/useOnboardingProgress";
import { clienteNaCentral } from "@/lib/ativacaoRules";

export default function CentralAtivacao() {
  const clientes = useCRM((s) => s.clientes);
  const { regras } = useAtivacaoRegras();

  const onboarding = useMemo(() => clientes.filter(clienteNaCentral), [clientes]);
  const { linhas, loading, reload } = useOnboardingAgregado(onboarding, regras);

  const [filtros, setFiltros] = useState<AtivacaoFiltros>(FILTROS_VAZIOS);
  const [openRegras, setOpenRegras] = useState(false);
  const [openImportar, setOpenImportar] = useState(false);
  const [ativandoLinha, setAtivandoLinha] = useState<AtivacaoLinha | null>(null);
  const [detalheLinha, setDetalheLinha] = useState<AtivacaoLinha | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const statusDisponiveis = useMemo(() => {
    const s = new Set<string>();
    linhas.forEach((l) => s.add(l.statusPrincipal));
    return Array.from(s).sort();
  }, [linhas]);

  const filtradas = useMemo(() => {
    return linhas.filter((l) => {
      if (filtros.busca && !l.cliente.nome_cliente.toLowerCase().includes(filtros.busca.toLowerCase()))
        return false;
      if (filtros.responsavelId !== "todos" && l.responsavelAtualId !== filtros.responsavelId)
        return false;
      if (filtros.risco !== "todos" && l.risco !== filtros.risco) return false;
      if (filtros.statusPrincipal !== "todos" && l.statusPrincipal !== filtros.statusPrincipal)
        return false;
      return true;
    });
  }, [linhas, filtros]);

  const handleVerTarefasResponsavel = (responsavelId: string) => {
    setFiltros((f) => ({ ...f, responsavelId }));
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1700px] mx-auto space-y-5">
      <CentralAtivacaoHeader
        onAbrirRegras={() => setOpenRegras(true)}
        onImportar={() => setOpenImportar(true)}
      />

      {/* KPIs + Meta de Ativação fixa no topo */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3">
        <CentralAtivacaoKpis linhas={linhas} />
        <MetaAtivacaoCard />
      </div>

      {/* Cards informativos: Alerta → Risco → Legenda */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AlertaResponsavelCard linhas={linhas} onVerTarefas={handleVerTarefasResponsavel} />
        <AtivacoesRiscoCard linhas={linhas} onAbrirDetalhe={(l) => setDetalheLinha(l)} />
        <LegendaStatusCard />
      </div>

      {/* Tabela em largura total */}
      <div ref={tableRef} className="space-y-3">
        <CentralAtivacaoFiltros
          filtros={filtros}
          onChange={setFiltros}
          statusDisponiveis={statusDisponiveis}
        />
        {loading && linhas.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <CentralAtivacaoTable
            linhas={filtradas}
            onAbrirDetalhe={(l) => setDetalheLinha(l)}
            onMarcarAtivo={(l) => setAtivandoLinha(l)}
          />
        )}
      </div>

      <RegrasAtivacaoDialog open={openRegras} onOpenChange={setOpenRegras} />
      <ImportarClientesDialog open={openImportar} onOpenChange={setOpenImportar} />
      <MarcarAtivoDialog
        open={!!ativandoLinha}
        onOpenChange={(v) => !v && setAtivandoLinha(null)}
        linha={ativandoLinha}
        onAtivado={reload}
      />
      <DetalheClienteAtivacao
        open={!!detalheLinha}
        onOpenChange={(v) => !v && setDetalheLinha(null)}
        linha={detalheLinha}
        onAtualizou={reload}
      />
    </div>
  );
}
