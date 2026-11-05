import { useState } from "react";
import Icon from "./Icon";

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

export default function ProductImage({ src, alt, className = "" }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div className={`ml-img-fallback ${className}`} role="img" aria-label={alt || "No image available"}>
        <Icon name="pill" size={30} />
      </div>
    );
  }
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} />;
}
