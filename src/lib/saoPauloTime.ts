/**
 * Utilitários de data/hora no fuso America/Sao_Paulo.
 * Brasil aboliu o horário de verão em 2019, então São Paulo é fixo em UTC-3.
 */
const SP_TZ = "America/Sao_Paulo";
const SP_OFFSET = "-03:00";

function partsInSP(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === "24" ? "00" : get("hour"),
    minute: get("minute"),
  };
}

/** Retorna o valor atual de São Paulo no formato esperado por <input type="datetime-local">. */
export function nowSaoPauloInputValue(): string {
  return isoToSaoPauloInput(new Date().toISOString());
}

/** Converte um ISO/UTC armazenado para o valor de input datetime-local em horário de São Paulo. */
export function isoToSaoPauloInput(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  const p = partsInSP(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Interpreta um valor de datetime-local como horário de São Paulo e retorna ISO em UTC. */
export function saoPauloInputToISO(value: string): string {
  if (!value) return "";
  // value: "YYYY-MM-DDTHH:mm" — anexamos offset fixo de SP para não depender do fuso do navegador.
  const d = new Date(`${value}:00${SP_OFFSET}`);
  return d.toISOString();
}
