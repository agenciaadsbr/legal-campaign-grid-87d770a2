import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

const proseClasses =
  "prose prose-sm dark:prose-invert max-w-none " +
  "[&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 " +
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0 " +
  "[&_li>p]:my-0 [&_strong]:font-semibold [&_em]:italic [&_u]:underline " +
  "[&_s]:line-through";

const HTML_RE = /<\/?[a-z][\s\S]*>/i;

export function RichTextView({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  if (!content) return null;
  const isHtml = HTML_RE.test(content);
  if (isHtml) {
    const safe = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "span"],
      ALLOWED_ATTR: [],
    });
    return (
      <div
        className={cn(proseClasses, "text-sm", className)}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }
  return (
    <div className={cn("text-sm whitespace-pre-wrap break-words", className)}>{content}</div>
  );
}
