import { useCallback, useEffect, useState } from "react";

export interface NativeColumnDef {
  key: string;
  label: string;
  defaultHidden?: boolean;
}

/**
 * Colunas "nativas" da tabela de Clientes — renderizadas no componente
 * ClientesGeralTable. Diferentemente das colunas DB (colunasCliente),
 * a visibilidade e ordem destas é persistida via localStorage por usuário.
 */
export const NATIVE_CLIENT_COLUMNS: NativeColumnDef[] = [
  { key: "cliente", label: "Nome do Cliente" },
  { key: "status", label: "Status" },
  { key: "ultimo_comentario", label: "Últimos Comentários" },
  { key: "nicho", label: "Nicho" },
  { key: "periodo", label: "Período do Contrato" },
  { key: "posts_atrasados", label: "Posts atrasados" },
  { key: "tarefas_atrasadas", label: "Tarefas atrasadas", defaultHidden: true },
  { key: "tarefas_urgentes", label: "Tarefas urgentes", defaultHidden: true },
  { key: "onboarding", label: "Onboarding", defaultHidden: true },
  { key: "contratacao", label: "Contratação" },
  { key: "relacionamento", label: "Relacionamento" },
  { key: "performance", label: "Performance" },
  { key: "relatorio", label: "Relatório" },
  { key: "acoes", label: "Ações" },
];

const STORAGE_KEY = "dashtasks:clientes:colunasNativas:v1";

interface StoredState {
  visibility: Record<string, boolean>;
  order: string[];
}

function loadState(): StoredState {
  const defaults: StoredState = {
    visibility: Object.fromEntries(
      NATIVE_CLIENT_COLUMNS.map((c) => [c.key, !c.defaultHidden]),
    ),
    order: NATIVE_CLIENT_COLUMNS.map((c) => c.key),
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    const visibility: Record<string, boolean> = { ...defaults.visibility };
    if (parsed.visibility) {
      for (const k of Object.keys(parsed.visibility)) {
        if (k in visibility) visibility[k] = !!parsed.visibility[k];
      }
    }
    const known = new Set(NATIVE_CLIENT_COLUMNS.map((c) => c.key));
    const orderFiltered = (parsed.order ?? []).filter((k) => known.has(k));
    const missing = defaults.order.filter((k) => !orderFiltered.includes(k));
    return { visibility, order: [...orderFiltered, ...missing] };
  } catch {
    return defaults;
  }
}

function saveState(s: StoredState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

const listeners = new Set<() => void>();
let currentState: StoredState | null = null;

function getState(): StoredState {
  if (!currentState) currentState = loadState();
  return currentState;
}

function setState(next: StoredState) {
  currentState = next;
  saveState(next);
  listeners.forEach((fn) => fn());
}

export function useColunasNativasClientes() {
  const [state, setLocal] = useState<StoredState>(() => getState());

  useEffect(() => {
    const fn = () => setLocal(getState());
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const toggle = useCallback((key: string) => {
    const s = getState();
    setState({
      ...s,
      visibility: { ...s.visibility, [key]: !s.visibility[key] },
    });
  }, []);

  const setVisible = useCallback((key: string, visible: boolean) => {
    const s = getState();
    setState({ ...s, visibility: { ...s.visibility, [key]: visible } });
  }, []);

  const reorder = useCallback((newOrder: string[]) => {
    const s = getState();
    setState({ ...s, order: newOrder });
  }, []);

  const isVisible = useCallback(
    (key: string) => state.visibility[key] !== false,
    [state.visibility],
  );

  const ordered = state.order
    .map((k) => NATIVE_CLIENT_COLUMNS.find((c) => c.key === k))
    .filter(Boolean) as NativeColumnDef[];

  return { state, ordered, isVisible, toggle, setVisible, reorder };
}
