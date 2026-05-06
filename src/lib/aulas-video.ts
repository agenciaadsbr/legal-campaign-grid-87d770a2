export type TipoVideo = "youtube" | "drive" | "upload";

export const TIPO_VIDEO_OPTIONS: { value: TipoVideo; label: string }[] = [
  { value: "youtube", label: "YouTube" },
  { value: "drive", label: "Google Drive" },
  { value: "upload", label: "Upload do computador" },
];

export function getTipoVideoLabel(tipo: string): string {
  return TIPO_VIDEO_OPTIONS.find((o) => o.value === tipo)?.label ?? tipo;
}

/** Extrai o ID de um vídeo do YouTube a partir de várias formas de URL. */
export function parseYoutubeId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace("/", "") || null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] ?? null;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] ?? null;
      const v = u.searchParams.get("v");
      if (v) return v;
    }
    return null;
  } catch {
    // talvez já seja só o ID
    if (/^[a-zA-Z0-9_-]{6,}$/.test(url.trim())) return url.trim();
    return null;
  }
}

/** Extrai o ID de um arquivo do Google Drive. */
export function parseDriveId(url: string): string | null {
  if (!url) return null;
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(url.trim())) return url.trim();
  return null;
}

/** Retorna a URL embed apropriada conforme o tipo. */
export function getEmbedUrl(tipo: TipoVideo, url: string): string | null {
  if (tipo === "youtube") {
    const id = parseYoutubeId(url);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (tipo === "drive") {
    const id = parseDriveId(url);
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  }
  return url || null; // upload usa URL direta no <video>
}
