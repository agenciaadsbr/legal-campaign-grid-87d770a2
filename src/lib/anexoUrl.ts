import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "anexos";
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;
const SIGN_MARKER = `/storage/v1/object/sign/${BUCKET}/`;
const DEFAULT_TTL = 60 * 60; // 1 hora

// Cache de signed URLs por path (renova ~5min antes de expirar)
const cache = new Map<string, { url: string; expiresAt: number }>();

/** Extrai o path interno do bucket "anexos" a partir de uma URL pública/assinada
 *  ou retorna a própria string se já parecer um path. */
export function extractAnexoPath(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = String(input);
  let idx = s.indexOf(PUBLIC_MARKER);
  if (idx >= 0) return decodeURIComponent(s.slice(idx + PUBLIC_MARKER.length).split("?")[0]);
  idx = s.indexOf(SIGN_MARKER);
  if (idx >= 0) return decodeURIComponent(s.slice(idx + SIGN_MARKER.length).split("?")[0]);
  // Se não é URL completa, assume que já é o path
  if (!/^https?:\/\//i.test(s)) return s.replace(/^\/+/, "");
  return null;
}

/** Gera (ou reaproveita do cache) uma signed URL para um anexo. */
export async function signAnexoUrl(
  urlOrPath: string | null | undefined,
  ttlSeconds: number = DEFAULT_TTL,
): Promise<string | null> {
  if (!urlOrPath) return null;
  const path = extractAnexoPath(urlOrPath);
  if (!path) return urlOrPath ?? null; // URL externa: devolve como está

  const now = Date.now();
  const cached = cache.get(path);
  if (cached && cached.expiresAt - 5 * 60 * 1000 > now) return cached.url;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) {
    if (error) console.error("[anexos] signed url falhou", error);
    return null;
  }
  cache.set(path, { url: data.signedUrl, expiresAt: now + ttlSeconds * 1000 });
  return data.signedUrl;
}

/** Hook para resolver uma URL de anexo em uma signed URL pronta para uso. */
export function useSignedAnexoUrl(
  urlOrPath: string | null | undefined,
  ttlSeconds: number = DEFAULT_TTL,
): string | null {
  const [signed, setSigned] = useState<string | null>(() => {
    if (!urlOrPath) return null;
    const path = extractAnexoPath(urlOrPath);
    if (!path) return urlOrPath; // URL externa
    const cached = cache.get(path);
    return cached?.url ?? null;
  });

  useEffect(() => {
    let cancelled = false;
    signAnexoUrl(urlOrPath, ttlSeconds).then((u) => {
      if (!cancelled) setSigned(u);
    });
    return () => {
      cancelled = true;
    };
  }, [urlOrPath, ttlSeconds]);

  return signed;
}
