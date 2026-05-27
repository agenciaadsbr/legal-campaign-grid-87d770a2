import { describe, it, expect } from "vitest";
import { isTaskActuallyOverdue } from "@/lib/minhasTarefas";

// Simulamos "hoje" como 27/05/2026 12:00 em SP (= 15:00 UTC)
const now = new Date("2026-05-27T15:00:00Z");
const longAgo = "2026-05-01T12:00:00Z";

describe("isTaskActuallyOverdue (regra reforçada)", () => {
  it("prazo igual a hoje não conta como atrasado", () => {
    expect(isTaskActuallyOverdue({ prazo: "2026-05-27", createdAt: longAgo, now })).toBe(false);
  });
  it("prazo futuro nunca conta como atrasado", () => {
    expect(isTaskActuallyOverdue({ prazo: "2026-06-30", createdAt: longAgo, now })).toBe(false);
  });
  it("prazo vencido com >24h de criação conta como atrasado", () => {
    expect(isTaskActuallyOverdue({ prazo: "2026-05-25", createdAt: longAgo, now })).toBe(true);
  });
  it("prazo vencido mas tarefa criada há <24h NÃO conta como atrasado", () => {
    const recente = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(isTaskActuallyOverdue({ prazo: "2026-05-25", createdAt: recente, now })).toBe(false);
  });
  it("status final / espera nunca conta como atrasado mesmo vencido", () => {
    for (const s of [
      "Entregue", "Postado", "Agendado", "Revisar",
      "Aguardando ação do cliente", "Aguardando etapa interna",
      "Aguardando etapa anterior", "Aguardando aprovação do cliente",
    ]) {
      expect(isTaskActuallyOverdue({ prazo: "2026-05-25", createdAt: longAgo, statusRaw: s, now })).toBe(false);
    }
  });
  it("sem prazo nunca conta como atrasado", () => {
    expect(isTaskActuallyOverdue({ prazo: null, createdAt: longAgo, now })).toBe(false);
  });
  it("ISO com horário tarde no dia em SP ainda é considerado o mesmo dia (não atrasado)", () => {
    // 27/05/2026 23:30 SP = 28/05 02:30 UTC. Como "hoje" é 27/05 em SP, prazo = hoje.
    expect(isTaskActuallyOverdue({ prazo: "2026-05-28T02:30:00Z", createdAt: longAgo, now })).toBe(false);
  });
});
