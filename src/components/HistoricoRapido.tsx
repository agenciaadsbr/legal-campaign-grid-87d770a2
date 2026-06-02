import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCRM } from "@/store/crm";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";

interface RawEvent {
  id: string;
  created_at: string;
  acao: string;
  de_status?: string | null;
  para_status?: string | null;
  payload?: any;
  usuario_id?: string | null;
}

export interface HistoricoEvento {
  id: string;
  created_at: string;
  texto: string;
  status_entrada?: string | null;
  duracao_label?: string | null;
}

const TZ = "America/Sao_Paulo";

function fmtData(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function fmtDuracao(ms: number) {
  if (ms < 0) ms = 0;
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `${h}h ${m}min` : `${h}h`;
  const d = Math.floor(h / 24);
  const hr = h % 24;
  return hr ? `${d} dia${d > 1 ? "s" : ""} ${hr}h` : `${d} dia${d > 1 ? "s" : ""}`;
}

interface HookOpts {
  tipo: "demanda" | "card";
  id: string;
  createdAt?: string | null;
  statusAtual?: string | null;
}

function useNomes() {
  const responsaveis = useCRM((s) => s.responsaveis);
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const r of responsaveis) map.set(r.id, r.nome ?? r.email ?? "—");
    return map;
  }, [responsaveis]);
}

export function useHistoricoEventos({ tipo, id, createdAt, statusAtual }: HookOpts) {
  const [raw, setRaw] = useState<RawEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [extraNomes, setExtraNomes] = useState<Map<string, string>>(new Map());
  const respNomes = useNomes();

  // Mapa unificado: responsaveis (por id) + usuários auth (via RPC)
  const nomes = useMemo(() => {
    const m = new Map<string, string>(respNomes);
    for (const [k, v] of extraNomes) if (!m.has(k)) m.set(k, v);
    return m;
  }, [respNomes, extraNomes]);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      try {
        let rawData: RawEvent[] = [];
        if (tipo === "demanda") {
          const { data } = await supabase
            .from("historico_demandas" as any)
            .select("id, created_at, acao, de_status, para_status, payload, usuario_id")
            .eq("demanda_id", id)
            .order("created_at", { ascending: true })
            .limit(200);
          rawData = ((data as any) ?? []) as RawEvent[];
        } else {
          const { data } = await supabase
            .from("atividade_cliente" as any)
            .select("id, created_at, acao, payload, usuario_id, tipo, referencia_id")
            .eq("referencia_id", id)
            .eq("tipo", "post")
            .order("created_at", { ascending: true })
            .limit(200);
          rawData = ((data as any[]) ?? []).map((d) => ({
            id: d.id,
            created_at: d.created_at,
            acao: d.acao,
            de_status: d.payload?.de ?? null,
            para_status: d.payload?.para ?? null,
            payload: d.payload,
            usuario_id: d.usuario_id,
          }));
        }
        if (cancel) return;
        setRaw(rawData);

        const uids = Array.from(
          new Set(
            rawData
              .map((r) => r.usuario_id)
              .filter((u): u is string => !!u && !respNomes.has(u)),
          ),
        );
        if (uids.length > 0) {
          const { data: nomesData } = await supabase.rpc(
            "get_user_display_names" as any,
            { _ids: uids },
          );
          if (cancel) return;
          const map = new Map<string, string>();
          if (Array.isArray(nomesData)) {
            for (const row of nomesData as any[]) {
              if (row?.id && row?.nome) map.set(row.id, row.nome);
            }
          }
          setExtraNomes(map);
        } else {
          setExtraNomes(new Map());
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    if (id) load();
    return () => {
      cancel = true;
    };
  }, [tipo, id, respNomes]);

  const eventos = useMemo<HistoricoEvento[]>(() => {
    if (!raw) return [];
    const nome = (uid?: string | null) => (uid && nomes.get(uid)) || "Sistema";
    const lista: HistoricoEvento[] = [];

    for (const e of raw) {
      const temAutor = !!e.usuario_id;
      const automatico = !temAutor || e.payload?.automatico === true || e.payload?.origem === "sistema" || e.payload?.origem === "template" || e.payload?.origem === "automacao";
      const autor = temAutor ? (nomes.get(e.usuario_id!) || "Usuário não identificado") : "Sistema";
      let texto = "";
      let statusEntrada: string | null = null;

      if (e.acao === "criada" || e.acao === "criado") {
        const respIds: string[] = e.payload?.responsaveis_ids ?? [];
        const respNomes = respIds.map((i) => nomes.get(i)).filter(Boolean).join(", ");
        const autorTxt = temAutor ? autor : "usuário não identificado";
        texto = respNomes
          ? `Tarefa criada por ${autorTxt} para ${respNomes}`
          : `Tarefa criada por ${autorTxt}`;
        statusEntrada = e.para_status ?? "Criar";
      } else if (e.acao === "status_alterado" || e.acao === "status") {
        const de = e.de_status ?? "—";
        const para = e.para_status ?? "—";
        texto = `${autor} moveu de ${de} para ${para}`;
        statusEntrada = para;
      } else if (e.acao === "responsaveis_alterados" || e.acao === "responsavel_alterado") {
        const para: string[] = e.payload?.para ?? [];
        const de: string[] = e.payload?.de ?? [];
        const paraN = para.map((i) => nomes.get(i)).filter(Boolean).join(", ");
        const deN = de.map((i) => nomes.get(i)).filter(Boolean).join(", ");
        if (deN && paraN) {
          texto = automatico
            ? `Sistema alterou automaticamente responsável de ${deN} para ${paraN}`
            : `${autor} alterou responsável de ${deN} para ${paraN}`;
        } else if (paraN) {
          texto = automatico
            ? `Sistema atribuiu automaticamente para ${paraN}`
            : `${autor} atribuiu para ${paraN}`;
        } else {
          texto = automatico
            ? `Sistema removeu responsáveis automaticamente`
            : `${autor} removeu responsáveis`;
        }
      } else if (e.acao === "dependencia_liberada") {
        texto = `Dependência liberada`;
      } else if (e.acao === "comentario" || e.acao === "anexo" || e.acao === "iniciado" || e.acao === "concluido") {
        // ignorar (são atividades, não movimentações)
        continue;
      } else {
        texto = `${autor} ${e.acao}`;
      }

      lista.push({
        id: e.id,
        created_at: e.created_at,
        texto,
        status_entrada: statusEntrada,
      });
    }

    // Calcular duração entre transições de status
    const statusChanges = lista.filter((l) => l.status_entrada);
    for (let i = 0; i < statusChanges.length; i++) {
      const cur = statusChanges[i];
      const next = statusChanges[i + 1];
      const inicio = new Date(cur.created_at).getTime();
      const fim = next ? new Date(next.created_at).getTime() : Date.now();
      cur.duracao_label = `${fmtDuracao(fim - inicio)} em ${cur.status_entrada}${next ? "" : " (atual)"}`;
    }

    return lista;
  }, [raw, nomes]);

  // Se não houver evento "criada" registrado mas temos createdAt, sintetizar um
  const eventosFinal = useMemo<HistoricoEvento[]>(() => {
    if (eventos.length > 0) return eventos;
    if (!createdAt) return [];
    const inicio = new Date(createdAt).getTime();
    const dur = fmtDuracao(Date.now() - inicio);
    return [
      {
        id: "synth-created",
        created_at: createdAt,
        texto: "Tarefa criada por usuário não identificado",
        status_entrada: statusAtual ?? null,
        duracao_label: statusAtual ? `${dur} em ${statusAtual} (atual)` : dur,
      },
    ];
  }, [eventos, createdAt, statusAtual]);

  return { eventos: eventosFinal, loading };
}

interface BadgeProps extends HookOpts {
  className?: string;
}

export function HistoricoRapidoHover({ className, ...opts }: BadgeProps) {
  return (
    <HoverCard openDelay={150} closeDelay={80}>
      <HoverCardTrigger asChild>
        <span
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-help select-none",
            className,
          )}
        >
          <History className="h-3 w-3" />
          Histórico rápido
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-3" align="start">
        <HistoricoRapidoConteudo {...opts} compact />
      </HoverCardContent>
    </HoverCard>
  );
}

export function HistoricoRapidoConteudo({
  compact,
  ...opts
}: HookOpts & { compact?: boolean }) {
  const { eventos, loading } = useHistoricoEventos(opts);
  const items = compact ? eventos.slice(-5) : eventos;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <History className="h-3.5 w-3.5" />
        Histórico rápido
      </div>
      {loading && eventos.length === 0 && (
        <div className="text-[11px] text-muted-foreground">Carregando...</div>
      )}
      {!loading && eventos.length === 0 && (
        <div className="text-[11px] text-muted-foreground">
          Sem histórico registrado ainda.
        </div>
      )}
      {items.length > 0 && (
        <ul className={cn("space-y-1.5", !compact && "max-h-72 overflow-y-auto pr-1")}>
          {items.map((ev) => (
            <li key={ev.id} className="text-[11px] leading-snug">
              <div className="text-foreground">
                <span className="text-muted-foreground tabular-nums">
                  {fmtData(ev.created_at)}
                </span>{" "}
                — {ev.texto}
              </div>
              {ev.duracao_label && (
                <div className="text-[10px] text-muted-foreground pl-1">
                  {ev.duracao_label}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {compact && eventos.length > 5 && (
        <div className="text-[10px] text-muted-foreground italic">
          Exibindo últimas {items.length} movimentações
        </div>
      )}
    </div>
  );
}
