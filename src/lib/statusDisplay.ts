/**
 * Helpers de exibição para labels de status.
 * Mantém o valor interno do banco intacto e apenas troca o que o usuário vê.
 */
export function displayStatusPostLabel(label: string): string {
  if (label === "Revisar") return "Aguardando aprovação do cliente";
  if (label === "Agendado") return "Agendar";
  return label;
}
