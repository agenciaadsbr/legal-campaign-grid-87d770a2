import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/RichTextEditor";
import { RichTextView } from "@/components/RichTextView";
import {
  BRIEFING_BLOCOS,
  useBriefing,
} from "@/store/briefing";
import { useCRM } from "@/store/crm";
import {
  Pencil,
  Save,
  Copy,
  FileText,
  FileDown,
  Image as ImageIcon,
  X,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadPdfFromText,
  downloadPngFromNode,
  downloadTxt,
  safeFilename,
} from "./exportUtils";

interface Props {
  clienteId: string;
  modoEdicaoExterno?: boolean;
  onModoEdicaoChange?: (v: boolean) => void;
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

  useEffect(() => {
    getOrInit(clienteId);
  }, [clienteId, getOrInit]);

  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modoEdicaoExterno) {
      setDraft(doc?.blocos ?? {});
      setEditando(true);
      onModoEdicaoChange?.(false);
    }
  }, [modoEdicaoExterno, doc, onModoEdicaoChange]);

  const responsavelNome = useMemo(() => {
    const r = responsaveis.find((r) => r.id === doc?.atualizado_por);
    return r?.nome ?? "—";
  }, [doc, responsaveis]);

  const entrarEdicao = () => {
    setDraft(doc?.blocos ?? {});
    setEditando(true);
  };
  const cancelar = () => {
    setEditando(false);
    setDraft({});
  };
  const salvar = async () => {
    setSalvando(true);
    await saveBlocos(clienteId, draft);
    setSalvando(false);
    setEditando(false);
  };

  const construirTexto = () => {
    const blocos = doc?.blocos ?? {};
    const linhas: string[] = [];
    linhas.push(`Briefing — ${cliente?.nome_cliente ?? ""}`);
    if (doc?.updated_at)
      linhas.push(
        `Última atualização: ${new Date(doc.updated_at).toLocaleString("pt-BR")}`,
      );
    linhas.push("");
    BRIEFING_BLOCOS.forEach((b) => {
      const v = (blocos[b.key] ?? "").replace(/<[^>]+>/g, "").trim();
      if (!v) return;
      linhas.push(b.label);
      linhas.push("-".repeat(48));
      linhas.push(v);
      linhas.push("");
    });
    return linhas.join("\n");
  };

  const exportarTxt = () => {
    downloadTxt(`briefing_${safeFilename(cliente?.nome_cliente ?? "cliente")}`, construirTexto());
  };
  const exportarPdf = () => {
    downloadPdfFromText(
      `briefing_${safeFilename(cliente?.nome_cliente ?? "cliente")}.pdf`,
      `Briefing — ${cliente?.nome_cliente ?? ""}`,
      construirTexto(),
    );
  };
  const exportarPng = async () => {
    if (!printRef.current) return;
    try {
      await downloadPngFromNode(
        `briefing_${safeFilename(cliente?.nome_cliente ?? "cliente")}.png`,
        printRef.current,
      );
    } catch (e: any) {
      toast.error("Erro ao gerar imagem", { description: e?.message });
    }
  };
  const copiar = async () => {
    await navigator.clipboard.writeText(construirTexto());
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
          {" • "}Por <span className="text-foreground font-medium">{responsavelNome}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {!editando ? (
            <>
              <Button variant="outline" size="sm" onClick={copiar}>
                <Copy className="h-4 w-4 mr-1" /> Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={exportarTxt}>
                <FileText className="h-4 w-4 mr-1" /> TXT
              </Button>
              <Button variant="outline" size="sm" onClick={exportarPdf}>
                <FileDown className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportarPng}>
                <ImageIcon className="h-4 w-4 mr-1" /> PNG
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
          <CardContent className="p-6 space-y-6">
            <div className="border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">
                  Briefing — {cliente?.nome_cliente}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Documento interno consolidado do cliente.
              </p>
            </div>

            {BRIEFING_BLOCOS.map((b) => {
              const valor = editando
                ? draft[b.key] ?? ""
                : (doc?.blocos ?? {})[b.key] ?? "";
              const vazioLeitura = !editando && !valor;
              return (
                <section key={b.key} className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {b.label}
                    {!editando && valor && (
                      <Badge variant="outline" className="text-[9px]">
                        preenchido
                      </Badge>
                    )}
                  </h3>
                  {editando ? (
                    <RichTextEditor
                      value={valor}
                      onChange={(html) =>
                        setDraft((d) => ({ ...d, [b.key]: html }))
                      }
                      placeholder={`Escreva sobre ${b.label.toLowerCase()}...`}
                      minHeight="80px"
                    />
                  ) : vazioLeitura ? (
                    <p className="text-xs text-muted-foreground italic">
                      Sem informação cadastrada.
                    </p>
                  ) : (
                    <RichTextView content={valor} />
                  )}
                </section>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
