import { ImgHTMLAttributes, VideoHTMLAttributes, AnchorHTMLAttributes } from "react";
import { useSignedAnexoUrl } from "@/lib/anexoUrl";

interface SignedSrcProps {
  url: string | null | undefined;
  ttlSeconds?: number;
}

export function SignedImg({
  url,
  ttlSeconds,
  ...rest
}: SignedSrcProps & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">) {
  const signed = useSignedAnexoUrl(url, ttlSeconds);
  if (!signed) return <span className="block w-full h-full bg-muted/40" aria-hidden />;
  return <img src={signed} {...rest} />;
}

export function SignedVideo({
  url,
  ttlSeconds,
  ...rest
}: SignedSrcProps & Omit<VideoHTMLAttributes<HTMLVideoElement>, "src">) {
  const signed = useSignedAnexoUrl(url, ttlSeconds);
  if (!signed) return <span className="block w-full h-full bg-black/40" aria-hidden />;
  return <video src={signed} {...rest} />;
}

export function SignedLink({
  url,
  ttlSeconds,
  children,
  ...rest
}: SignedSrcProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const signed = useSignedAnexoUrl(url, ttlSeconds);
  return (
    <a
      href={signed ?? "#"}
      onClick={(e) => {
        if (!signed) {
          e.preventDefault();
        }
        rest.onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
