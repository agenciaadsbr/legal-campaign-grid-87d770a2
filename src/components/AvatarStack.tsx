import { Responsavel } from "@/store/crm";
import { cn } from "@/lib/utils";

interface Props {
  responsaveis: Responsavel[];
  size?: "xs" | "sm" | "md";
  max?: number;
}

const sizeMap = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
};

export function AvatarStack({ responsaveis, size = "sm", max = 3 }: Props) {
  const visible = responsaveis.slice(0, max);
  const overflow = responsaveis.length - visible.length;
  return (
    <div className="flex -space-x-2">
      {visible.map((r) => (
        <div
          key={r.id}
          title={r.nome}
          className={cn(
            "rounded-full ring-2 ring-background flex items-center justify-center font-semibold text-white overflow-hidden",
            sizeMap[size]
          )}
          style={{ backgroundColor: r.avatar_url ? undefined : r.cor }}
        >
          {r.avatar_url ? (
            <img
              src={r.avatar_url}
              alt={r.nome}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div className={cn("rounded-full ring-2 ring-background bg-muted text-muted-foreground flex items-center justify-center font-semibold", sizeMap[size])}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
