import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  CaseUpper,
  CaseLower,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const proseClasses =
  "prose prose-sm dark:prose-invert max-w-none focus:outline-none " +
  "[&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 " +
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0 " +
  "[&_li>p]:my-0 [&_strong]:font-semibold [&_em]:italic [&_u]:underline " +
  "[&_s]:line-through";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onEnterSubmit?: () => void;
  className?: string;
  minHeight?: string;
}

function ToolbarBtn({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

function transformSelection(editor: Editor, fn: (s: string) => string) {
  const { from, to, empty } = editor.state.selection;
  if (empty) return;
  const text = editor.state.doc.textBetween(from, to, "\n");
  if (!text) return;
  editor.chain().focus().insertContentAt({ from, to }, fn(text)).run();
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  onEnterSubmit,
  className,
  minHeight = "min-h-[60px]",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn(proseClasses, "px-3 py-2", minHeight),
        "data-placeholder": placeholder ?? "",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey && onEnterSubmit) {
          event.preventDefault();
          onEnterSubmit();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Sync external value changes (e.g. clear after send)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "<p></p>";
    if (current !== incoming && (value === "" || value == null)) {
      editor.commands.setContent("", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <div className="flex items-center gap-0.5 flex-wrap border-b px-1.5 py-1">
        <ToolbarBtn
          title="Negrito (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Itálico (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Sublinhado (Ctrl+U)"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Riscado"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn
          title="Lista com marcadores"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Lista numerada"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn
          title="CAIXA ALTA (selecione o texto)"
          onClick={() => transformSelection(editor, (s) => s.toUpperCase())}
        >
          <CaseUpper className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="caixa baixa (selecione o texto)"
          onClick={() => transformSelection(editor, (s) => s.toLowerCase())}
        >
          <CaseLower className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn
          title="Desfazer"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          title="Refazer"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>
      <div className="relative">
        <EditorContent editor={editor} />
        {editor.isEmpty && placeholder && (
          <div className="pointer-events-none absolute top-2 left-3 text-sm text-muted-foreground">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
