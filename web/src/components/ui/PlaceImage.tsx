import { cn } from "./cn";

/**
 * A place cover or photo with a 640 px and a 1200 px WebP (`srcSet` + `sizes`), so phones fetch
 * the small one. Below the fold it loads lazily; `priority` is for the one image above the fold.
 * The box is sized by the caller (`aspect-[3/2]` parent), so nothing shifts while it loads.
 */
export function PlaceImage({
  w640,
  w1200,
  alt,
  sizes,
  priority = false,
  width = 640,
  height = 427,
  className,
}: {
  w640: string;
  w1200?: string | null;
  alt: string;
  /** The `sizes` attribute, e.g. `(min-width: 1024px) 380px, 100vw`. */
  sizes: string;
  priority?: boolean;
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    // Plain <img>: next/image cannot build a srcset for files it does not optimise.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={w640}
      srcSet={w1200 ? `${w640} 640w, ${w1200} 1200w` : undefined}
      sizes={w1200 ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn("size-full object-cover", className)}
    />
  );
}
