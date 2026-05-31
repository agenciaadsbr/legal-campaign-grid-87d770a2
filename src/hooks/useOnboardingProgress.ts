/**
 * Carrega, em uma única passada, todas as Demandas, Cards Pai e Etapas
 * dos clientes informados. Retorna mapas indexados por cliente_id e calcula
 * progresso/risco/status principal usando ativacaoRules.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Cliente } from "@/store/crm";
import type { Demanda } from "@/store/demandas";
import type { CardPai, CardPaiEtapa } from "@/store/cardPai";
import {
  calcularBadgeAtual,
  calcularProgresso,
  calcularProximaAcao,
  calcularRisco,
  calcularStatusPrincipal,
  calcularStatusVisual,
  calcularUltimoAvanco,
  clientePodeAtivar,
  diasNoOnboarding,
  diasRestantesMeta,
  modulosDoCliente,
  proximoBloqueioDetalhado,
  pendenciasCriticasParaAtivar,
  type AtivacaoRegras,
  type Risco,
  type StatusVisual,
  type ModuloAtivacao,
} from "@/lib/ativacaoRules";

export interface AtivacaoLinha {
  cliente: Cliente;
  diasOnboarding: number;
  diasRestantes: number;
  progresso: { resolvidas: number; total: number; pct: number };
  statusPrincipal: string;
  statusVisual: StatusVisual;
  badgeAtual: string | null;
  proximoBloqueio: string;
  proximaAcao: { titulo: string; modulo: string | null };
  responsavelAtualId: string | null;
  risco: Risco;
  motivosRisco: string[];
  ultimoAvanco: string | null;
  podeAtivar: boolean;
  pendenciasRegra: string[];
  atendidasRegra: string[];
  pendenciasCriticas: string[];
  modulos: ModuloAtivacao[];
  cardsPai: CardPai[];
  etapas: CardPaiEtapa[];
  demandas: Demanda[];
}

export function useOnboardingAgregado(clientes: Cliente[], regras: AtivacaoRegras) {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [cardsPai, setCardsPai] = useState<CardPai[]>([]);
  const [etapas, setEtapas] = useState<CardPaiEtapa[]>([]);
  const [loading, setLoading] = useState(false);

  const ids = useMemo(() => clientes.map((c) => c.id), [clientes]);

  const load = useCallback(async () => {
    if (ids.length === 0) {
      setDemandas([]);
      setCardsPai([]);
      setEtapas([]);
      return;
    }
    setLoading(true);
    try {
      const [{ data: dms }, { data: cps }] = await Promise.all([
        supabase.from("demandas").select("*").in("cliente_id", ids),
        supabase.from("card_pai").select("*").in("cliente_id", ids),
      ]);
      const cardIds = (cps ?? []).map((c: any) => c.id);
      let eps: any[] = [];
      if (cardIds.length > 0) {
        const { data } = await supabase
          .from("card_pai_etapas")
          .select("*")
          .in("card_pai_id", cardIds)
          .order("ordem", { ascending: true });
        eps = data ?? [];
      }
      setDemandas((dms ?? []) as Demanda[]);
      setCardsPai((cps ?? []) as CardPai[]);
      setEtapas(eps as CardPaiEtapa[]);
    } finally {
      setLoading(false);
    }
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: invalida ao mudar tabelas relevantes.
  useEffect(() => {
    if (ids.length === 0) return;
    const ch = supabase
      .channel("central-ativacao")
      .on("postgres_changes", { event: "*", schema: "public", table: "demandas" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "card_pai" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "card_pai_etapas" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [ids.join(","), load]); // eslint-disable-line react-hooks/exhaustive-deps

  const linhas: AtivacaoLinha[] = useMemo(() => {
    return clientes.map((cliente) => {
      const d = demandas.filter((x) => x.cliente_id === cliente.id);
      const c = cardsPai.filter((x) => x.cliente_id === cliente.id);
      const idsCards = new Set(c.map((x) => x.id));
      const e = etapas.filter((x) => idsCards.has(x.card_pai_id));

      const progresso = calcularProgresso(e, d);
      const status = calcularStatusPrincipal(d);
      const ultimo = calcularUltimoAvanco(d, e);
      const { risco, motivos } = calcularRisco({ cliente, demandas: d, etapas: e, ultimoAvanco: ultimo });
      const modulos = modulosDoCliente(c, e);
      const ativar = clientePodeAtivar({ cliente, cardsPai: c, etapas: e, demandas: d, regras });
      const criticas = pendenciasCriticasParaAtivar({ demandas: d, etapas: e });

      const badgeAtual = calcularBadgeAtual(d) ?? status.demanda?.status_motivo ?? null;
      const respAtual =
        status.demanda?.responsavel_id ||
        status.demanda?.responsaveis_ids?.[0] ||
        cliente.responsaveis?.[0] ||
        null;
      const diasOnb = diasNoOnboarding(cliente);
      const diasRest = diasRestantesMeta(cliente);
      const statusVisual = calcularStatusVisual({
        cliente,
        demandas: d,
        diasRestantes: diasRest,
        risco,
        badgeAtual,
      });
      const proxAcao = calcularProximaAcao({ modulos, demandas: d });

      return {
        cliente,
        diasOnboarding: diasOnb,
        diasRestantes: diasRest,
        progresso,
        statusPrincipal: status.label,
        statusVisual,
        badgeAtual,
        proximoBloqueio: proximoBloqueioDetalhado({ demandas: d, etapas: e, modulos }),
        proximaAcao: proxAcao,
        responsavelAtualId: respAtual,
        risco,
        motivosRisco: motivos,
        ultimoAvanco: ultimo,
        podeAtivar: ativar.pronto,
        pendenciasRegra: ativar.pendencias,
        atendidasRegra: ativar.atendidas,
        pendenciasCriticas: criticas,
        modulos,
        cardsPai: c,
        etapas: e,
        demandas: d,
      };
    });
  }, [clientes, demandas, cardsPai, etapas, regras]);

  return { linhas, loading, reload: load };
}
