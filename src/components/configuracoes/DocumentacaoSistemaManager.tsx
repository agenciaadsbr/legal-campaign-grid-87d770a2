import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Archive, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

function todayStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Bundles all source files as raw strings (lazy-loaded chunks)
const sourceFiles = import.meta.glob(
  [
    "/src/**/*",
    "/public/**/*",
    "/supabase/**/*",
    "/index.html",
    "/package.json",
    "/tsconfig*.json",
    "/vite.config.ts",
    "/vitest.config.ts",
    "/tailwind.config.ts",
    "/postcss.config.js",
    "/eslint.config.js",
    "/components.json",
    "/README.md",
  ],
  { query: "?raw", import: "default" },
);

const EXCLUDE_PATTERNS = [
  /\/\.env(\.|$)/,
  /\/node_modules\//,
  /\/dist\//,
  /\.log$/,
  /\.DS_Store$/,
];

async function downloadReadme() {
  const mod = (await import("/README.md?raw")) as { default: string };
  const blob = new Blob([mod.default], { type: "text/markdown;charset=utf-8" });
  triggerDownload(blob, "README.md");
}

async function downloadSourceBackup() {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const entries = Object.entries(sourceFiles);
  let added = 0;
  for (const [path, loader] of entries) {
    if (EXCLUDE_PATTERNS.some((re) => re.test(path))) continue;
    try {
      const content = (await (loader as () => Promise<string>)()) as unknown as string;
      const cleanPath = path.replace(/^\//, "");
      zip.file(cleanPath, content);
      added++;
    } catch {
      // skip unreadable files
    }
  }
  if (!added) throw new Error("Nenhum arquivo incluído no backup");
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  triggerDownload(blob, `dash-tasks-backup-${todayStamp()}.zip`);
}

export function DocumentacaoSistemaManager() {
  const { isAdmin } = useAuth();
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [loadingBackup, setLoadingBackup] = useState(false);

  const handleReadme = async () => {
    setLoadingReadme(true);
    try {
      await downloadReadme();
      toast.success("README.md baixado");
    } catch (e) {
      toast.error("Falha ao baixar README", { description: String((e as Error).message) });
    } finally {
      setLoadingReadme(false);
    }
  };

  const handleBackup = async () => {
    setLoadingBackup(true);
    try {
      await downloadSourceBackup();
      toast.success("Backup do código-fonte gerado");
    } catch (e) {
      toast.error("Falha ao gerar backup", { description: String((e as Error).message) });
    } finally {
      setLoadingBackup(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Apenas administradores podem acessar a documentação e o backup do sistema.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Documentação do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3 text-xs text-muted-foreground">
          <p>
            O README descreve módulos, funcionalidades, permissões, integrações, variáveis de
            ambiente, instruções de execução e regras de negócio do Dash Tasks.
          </p>
          <Button size="sm" onClick={handleReadme} disabled={loadingReadme}>
            {loadingReadme ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Baixar README.md
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Archive className="h-4 w-4" /> Backup do Código-Fonte
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3 text-xs text-muted-foreground">
          <p>
            Gera um arquivo <code>dash-tasks-backup-AAAA-MM-DD.zip</code> contendo{" "}
            <code>src/</code>, <code>public/</code>, <code>supabase/</code>, arquivos de
            configuração e o README. <strong>Não inclui</strong> <code>.env</code>,{" "}
            <code>node_modules</code>, secrets, tokens, banco de dados ou dados de clientes.
          </p>
          <p className="text-[11px]">
            O backup é gerado integralmente no navegador. Pode levar alguns segundos.
          </p>
          <Button size="sm" onClick={handleBackup} disabled={loadingBackup}>
            {loadingBackup ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Baixar backup do código-fonte
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
