// Helper compartilhado para chamar o Lovable AI Gateway via Vercel AI SDK
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";

export const createLovableAiGatewayProvider = (lovableApiKey: string) =>
  createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Lista curada de modelos disponíveis por provider, com label amigável
export const CURATED_MODELS: Record<string, Array<{ id: string; label: string; descricao: string; pricing?: { input: number; output: number } }>> = {
  gemini: [
    { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite · rápido e barato", descricao: "Mais barato, alto volume", pricing: { input: 0.075, output: 0.3 } },
    { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash · equilibrado", descricao: "Padrão recomendado", pricing: { input: 0.3, output: 2.5 } },
    { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro · alta qualidade", descricao: "Tarefas complexas", pricing: { input: 1.25, output: 10 } },
  ],
  gpt: [
    { id: "openai/gpt-4o-mini", label: "GPT-4o mini · rápido e barato", descricao: "Mais barato, alto volume", pricing: { input: 0.15, output: 0.6 } },
    { id: "openai/gpt-4o", label: "GPT-4o · qualidade alta", descricao: "Multimodal de alta qualidade", pricing: { input: 2.5, output: 10 } },
    { id: "openai/gpt-4.1-mini", label: "GPT-4.1 mini · contexto longo", descricao: "Janela longa, custo baixo", pricing: { input: 0.4, output: 1.6 } },
    { id: "openai/gpt-4.1", label: "GPT-4.1 · raciocínio forte", descricao: "Raciocínio e código", pricing: { input: 2, output: 8 } },
    { id: "openai/gpt-5-mini", label: "GPT-5 mini · novo", descricao: "Geração mais recente, equilibrado", pricing: { input: 0.25, output: 2 } },
    { id: "openai/gpt-5", label: "GPT-5 · top de linha", descricao: "Máxima qualidade", pricing: { input: 1.25, output: 10 } },
  ],
};

export function defaultModelFor(provider: string): string {
  const list = CURATED_MODELS[provider];
  return list?.[1]?.id ?? list?.[0]?.id ?? "google/gemini-2.5-flash";
}

export function estimateCost(provider: string, modelId: string, tokensIn: number, tokensOut: number): number {
  const m = CURATED_MODELS[provider]?.find((x) => x.id === modelId);
  if (!m?.pricing) return 0;
  // pricing é por 1M tokens
  return (tokensIn / 1_000_000) * m.pricing.input + (tokensOut / 1_000_000) * m.pricing.output;
}
