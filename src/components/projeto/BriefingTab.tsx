import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBriefing } from "@/store/briefing";
import { useCRM } from "@/store/crm";
import {
  Pencil,
  Save,
  Copy,
  FileText,
  X,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { downloadTxt, safeFilename } from "./exportUtils";

interface Props {
  clienteId: string;
  modoEdicaoExterno?: boolean;
  onModoEdicaoChange?: (v: boolean) => void;
}

const PLACEHOLDER = `Cole aqui o briefing completo do cliente. Exemplo:

🔗 Resumo geral:
Cliente atua no ramo de...

🔗 Público-alvo:
Mulheres entre 30-50 anos...

🔗 Links importantes:
https://exemplo.com
`;

// Renderiza texto plano em JSX estilo WhatsApp:
// - URLs viram links clicáveis
// - Linhas iniciadas com 🔗 ficam em negrito
function renderMensagemFormatada(texto: string) {
  const linhas = texto.split("\n");
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return linhas.map((linha, idx) => {
    const isHeader = linha.trim().startsWith("🔗");
    const partes = linha.split(urlRegex);
    const conteudo = partes.map((p, i) =>
      urlRegex.test(p) ? (
        <a
          key={i}
          href={p}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline break-all"
        >
          {p}
        </a>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
    return (
      <div
        key={idx}
        className={isHeader ? "font-semibold text-foreground mt-2" : ""}
      >
        {linha.length === 0 ? "\u00A0" : conteudo}
      </div>
    );
  });
}

export function BriefingTab({
  clienteId,
  modoEdicaoExterno,
  onModoEdicaoChange,
}: Props) {
  const { clientes, responsaveis } = useCRM();
  const cliente = clientes.find((c) => c.id === clienteId);
  const docs = useBriefing((s) => s.docs);
  const getOrInit = useBriefing((s) => s.getOrInit);
  const saveBlocos = useBriefing((s) => s.saveBlocos);

  const doc = docs[clienteId];
  const documento = (doc?.blocos ?? {})["documento"] ?? "";

  useEffect(() => {
    getOrInit(clienteId);
  }, [clienteId, getOrInit]);

  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState("");
  const [salvando, setSalvando] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modoEdicaoExterno) {
      setDraft(documento);
      setEditando(true);
      onModoEdicaoChange?.(false);
    }
  }, [modoEdicaoExterno, documento, onModoEdicaoChange]);

  const responsavelNome = useMemo(() => {
    const r = responsaveis.find((r) => r.id === doc?.atualizado_por);
    return r?.nome ?? "—";
  }, [doc, responsaveis]);

  const entrarEdicao = () => {
    setDraft(documento);
    setEditando(true);
  };
  const cancelar = () => {
    setEditando(false);
    setDraft("");
  };
  const salvar = async () => {
    setSalvando(true);
    await saveBlocos(clienteId, { documento: draft });
    setSalvando(false);
    setEditando(false);
  };

  const exportarTxt = () => {
    downloadTxt(
      `briefing_${safeFilename(cliente?.nome_cliente ?? "cliente")}`,
      documento,
    );
  };
  const copiar = async () => {
    await navigator.clipboard.writeText(documento);
    toast.success("Briefing copiado");
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs text-muted-foreground">
          Última atualização:{" "}
          <span className="text-foreground font-medium">
            {doc?.updated_at
              ? new Date(doc.updated_at).toLocaleString("pt-BR")
              : "—"}
          </span>
          {" • "}Por{" "}
          <span className="text-foreground font-medium">{responsavelNome}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {!editando ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={copiar}
                disabled={!documento}
              >
                <Copy className="h-4 w-4 mr-1" /> Copiar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportarTxt}
                disabled={!documento}
              >
                <FileText className="h-4 w-4 mr-1" /> TXT
              </Button>
              <Button size="sm" onClick={entrarEdicao}>
                <Pencil className="h-4 w-4 mr-1" /> Editar briefing
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={cancelar}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={salvar} disabled={salvando}>
                <Save className="h-4 w-4 mr-1" />
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div ref={printRef} className="bg-background">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">
                  Briefing — {cliente?.nome_cliente}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Documento único do cliente. Cole o briefing completo no formato
                que preferir.
              </p>
            </div>

            {editando ? (
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={PLACEHOLDER}
                className="min-h-[480px] font-mono text-sm whitespace-pre-wrap"
              />
            ) : documento ? (
              <div className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                {renderMensagemFormatada(documento)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Nenhum briefing cadastrado. Clique em{" "}
                <strong>Editar briefing</strong> para adicionar.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
