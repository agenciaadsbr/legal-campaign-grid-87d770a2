/**
 * fetchAllRows — paginação completa contra o limite padrão de 1.000 linhas do Supabase/PostgREST.
 *
 * Por que existe:
 *   Toda consulta `select` sem `.range()` é truncada silenciosamente em 1.000 linhas
 *   (max-rows do PostgREST). Tabelas como `demandas`, `historico_demandas`, `cards`,
 *   `posts` e `cliente_planejamento_itens` já passam desse volume, o que fazia
 *   registros antigos (mas ainda em aberto) sumirem da interface e os contadores
 *   refletirem apenas o total truncado.
 *
 * Como usar:
 *   const { data, error } = await fetchAllRows<Row>((from, to) =>
 *     supabase.from("demandas").select("*")
 *       .order("created_at", { ascending: false })
 *       .order("id", { ascending: true })   // desempate estável — OBRIGATÓRIO
 *       .range(from, to),
 *   );
 *
 * Regras:
 *   - O builder DEVE aplicar uma ordenação estável (coluna principal + `id`) para que
 *     páginas consecutivas não repitam nem pulem linhas.
 *   - As páginas são buscadas em lotes concorrentes (`concurrency`) até que uma página
 *     retorne menos que `pageSize` linhas. O custo extra é, no máximo, `concurrency - 1`
 *     requisições vazias no último lote.
 *   - Em caso de erro, retorna as linhas já obtidas + o erro (o chamador decide o que fazer).
 */

/** Tamanho de página alinhado ao max-rows padrão do PostgREST. */
export const SUPABASE_PAGE_SIZE = 1000;

export interface FetchAllRowsResult<T> {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any | null;
}

export interface FetchAllRowsOptions {
  /** Linhas por página (padrão 1000; não deve exceder o max-rows do projeto). */
  pageSize?: number;
  /** Quantas páginas buscar em paralelo por lote (padrão 4). */
  concurrency?: number;
  /** Trava de segurança contra loops infinitos (padrão 200 páginas = 200k linhas). */
  maxPages?: number;
}

type PageResponse<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

export async function fetchAllRows<T = unknown>(
  buildPage: (from: number, to: number) => PageResponse<T>,
  options: FetchAllRowsOptions = {},
): Promise<FetchAllRowsResult<T>> {
  const pageSize = Math.max(1, options.pageSize ?? SUPABASE_PAGE_SIZE);
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const maxPages = Math.max(1, options.maxPages ?? 200);

  const all: T[] = [];
  let page = 0;

  while (page < maxPages) {
    const batchSize = Math.min(concurrency, maxPages - page);
    const batch = Array.from({ length: batchSize }, (_, i) => {
      const from = (page + i) * pageSize;
      return buildPage(from, from + pageSize - 1);
    });
    const results = await Promise.all(batch);

    // Processa em ordem; para no primeiro erro ou na primeira página incompleta.
    for (const res of results) {
      if (res.error) return { data: all, error: res.error };
      const rows = res.data ?? [];
      all.push(...rows);
      if (rows.length < pageSize) return { data: all, error: null };
    }
    page += batchSize;
  }

  console.warn(`[fetchAllRows] maxPages (${maxPages}) atingido — resultado pode estar incompleto.`);
  return { data: all, error: null };
}
