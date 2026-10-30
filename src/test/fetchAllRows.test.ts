import { describe, it, expect } from "vitest";
import { fetchAllRows } from "@/lib/fetchAllRows";

/** Simula o PostgREST: devolve no máximo `max` linhas do intervalo pedido. */
function fakeTable(total: number, max = 1000) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const calls: Array<[number, number]> = [];
  const build = (from: number, to: number) => {
    calls.push([from, to]);
    const end = Math.min(to + 1, from + max);
    return Promise.resolve({ data: rows.slice(from, end), error: null });
  };
  return { build, calls };
}

describe("fetchAllRows", () => {
  it("traz todas as 2.380 demandas, não só as 1.000 primeiras", async () => {
    const t = fakeTable(2380);
    const { data, error } = await fetchAllRows(t.build);
    expect(error).toBeNull();
    expect(data).toHaveLength(2380);
    expect(new Set(data.map((r) => r.id)).size).toBe(2380);
  });

  it("funciona com exatamente 1.000 linhas (página cheia seguida de vazia)", async () => {
    const { data } = await fetchAllRows(fakeTable(1000).build);
    expect(data).toHaveLength(1000);
  });

  it("devolve as linhas já obtidas e o erro quando uma página falha", async () => {
    let n = 0;
    const { data, error } = await fetchAllRows(
      () => {
        n++;
        return Promise.resolve(
          n === 1
            ? { data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null }
            : { data: null, error: { message: "boom" } },
        );
      },
      { concurrency: 1 },
    );
    expect(data).toHaveLength(1000);
    expect(error).toEqual({ message: "boom" });
  });
});
