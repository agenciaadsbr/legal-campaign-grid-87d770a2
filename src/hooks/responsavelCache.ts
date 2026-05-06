// Cache em memória do mapeamento auth.uid -> responsavel_id.
// Mantido em módulo separado para evitar import circular entre
// useAuth.tsx (que precisa limpar no signOut) e useResponsavelAtual.ts.
export const responsavelCache: Record<string, string | null> = {};

export function clearResponsavelCache() {
  for (const k of Object.keys(responsavelCache)) delete responsavelCache[k];
}
