import { cn } from "@/lib/shared/utils";
import type { Experimental_GeneratedImage } from "ai";

export type ImageProps = Experimental_GeneratedImage & {
  className?: string;
  alt?: string;
};

export const Image = ({
  base64,
  mediaType,
  uint8Array: _uint8Array,
  className,
  alt,
  ...props
}: ImageProps) => (
  <img
    {...props}
    alt={alt}
    className={cn("h-auto max-w-full overflow-hidden rounded-md", className)}
    src={`data:${mediaType};base64,${base64}`}
  />
);
