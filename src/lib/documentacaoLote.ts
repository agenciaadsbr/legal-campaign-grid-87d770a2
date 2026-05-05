// Parser e helpers compartilhados entre DocumentacaoTab (Projeto Completo)
// e DocumentosGlobaisManager (Configurações). Mesma lógica em ambos.

import type { DocBloco } from "@/store/documentacao";

export type LoteItem = {
  titulo: string;
  url: string | null;
  login: string | null;
  senha: string | null;
  observacao: string | null;
};

export const TITULO_MENSAGEM_PADRAO: Record<DocBloco, string> = {
  acessos: "Mensagem de acessos",
  materiais: "Materiais enviados ao cliente",
  documentos: "Mensagem de documentos",
  links: "Mensagem de links importantes",
  reunioes: "Mensagem de reuniões",
};

export function parseLoteTexto(texto: string, bloco?: DocBloco): LoteItem[] {
  const txt = (texto ?? "").trim();
  if (!txt) return [];

  const isListaLivre =
    bloco === "documentos" || bloco === "links" || bloco === "reunioes";

  const linhasNaoVazias = txt.split("\n").filter((l) => l.trim());

  // Formato simples (uma linha por item com |)
  const usaPipe = linhasNaoVazias.some((l) => l.includes("|"));
  if (usaPipe) {
    return linhasNaoVazias
      .map((l) => l.trim())
      .filter(Boolean)
      .map((linha) => {
        const partes = linha.split("|").map((p) => p.trim());
        return {
          titulo: partes[0] || linha,
          url: partes[1] || null,
          login: partes[2] || null,
          senha: partes[3] || null,
          observacao: partes[4] || null,
        };
      });
  }

  const URL_RE = /https?:\/\/[^\s)>\]]+/i;
  const LOGIN_RE = /^\s*(?:login|e-?mail|usu[áa]rio|user)\s*[:\-]\s*(.+)$/im;
  const SENHA_RE = /^\s*(?:senha|password|pass|pwd)\s*[:\-]\s*(.+)$/im;
  const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

  const limparTitulo = (s: string) =>
    s
      .replace(EMOJI_RE, "")
      .replace(/^[\s\-•*▶►]+/, "")
      .replace(/[:：]\s*$/, "")
      .trim();

  const blocos = txt
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  // ---- Lista livre (Documentos / Links / Reuniões) ----
  if (isListaLivre) {
    const semSeparadores = blocos.length <= 1;
    const bullets =
      linhasNaoVazias.filter((l) => /^[\s]*[•\-*▶►]/.test(l)).length >=
      Math.max(2, Math.ceil(linhasNaoVazias.length / 2));

    const semCredenciais = !linhasNaoVazias.some(
      (l) => LOGIN_RE.test(l) || SENHA_RE.test(l),
    );

    if ((semSeparadores || bullets) && semCredenciais) {
      return linhasNaoVazias
        .map((linha) => {
          const matchUrl = linha.match(URL_RE);
          const url = matchUrl ? matchUrl[0].replace(/[.,);\]]+$/, "") : null;
          let titulo = limparTitulo(linha.replace(URL_RE, "").trim());
          if (!titulo && url) {
            try {
              titulo = new URL(url).hostname.replace(/^www\./, "");
            } catch {
              titulo = url;
            }
          }
          if (!titulo && !url) return null;
          return {
            titulo: titulo || (url ?? ""),
            url,
            login: null,
            senha: null,
            observacao: null,
          } as LoteItem;
        })
        .filter((x): x is LoteItem => x !== null);
    }
  }

  // ---- Modo blocos (separados por linha em branco) ----
  const itens: LoteItem[] = [];

  for (const blocoTxt of blocos) {
    const linhas = blocoTxt.split("\n").map((l) => l.trim()).filter(Boolean);
    if (linhas.length === 0) continue;

    let url: string | null = null;
    let login: string | null = null;
    let senha: string | null = null;
    const obsLinhas: string[] = [];
    let tituloCandidato = "";

    for (const linha of linhas) {
      const matchUrl = linha.match(URL_RE);
      const matchLogin = linha.match(LOGIN_RE);
      const matchSenha = linha.match(SENHA_RE);

      if (matchLogin) {
        login = matchLogin[1].trim();
        continue;
      }
      if (matchSenha) {
        senha = matchSenha[1].trim();
        continue;
      }
      if (matchUrl) {
        if (!url) {
          url = matchUrl[0].replace(/[.,);\]]+$/, "");
        }
        const semUrl = linha.replace(matchUrl[0], "").trim();
        if (semUrl) {
          if (!tituloCandidato) tituloCandidato = limparTitulo(semUrl);
          else obsLinhas.push(semUrl);
        }
        continue;
      }
      if (!tituloCandidato) {
        tituloCandidato = limparTitulo(linha);
      } else {
        obsLinhas.push(linha);
      }
    }

    if (!url && !login && !senha) {
      if (!isListaLivre) continue;
      if (!tituloCandidato && obsLinhas.length === 0) continue;
    }

    let titulo = tituloCandidato;
    if (!titulo) {
      if (url) {
        try {
          titulo = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          titulo = url;
        }
      } else {
        titulo = obsLinhas[0] ?? "Item";
      }
    }

    itens.push({
      titulo,
      url,
      login,
      senha,
      observacao: obsLinhas.length ? obsLinhas.join("\n") : null,
    });
  }

  return itens;
}
