import { BRAND_LOGO, BRAND_NAME } from "@/lib/brand";
import Image from "next/image";

type BrandLogoProps = {
  width: number;
  height: number;
  className?: string;
  /** Wrapper / layout classes (e.g. shrink-0). */
  wrapperClassName?: string;
  priority?: boolean;
  alt?: string;
};

/**
 * Taplite mark on light-themed pages. `taplite_obic.png` is authored for dark surfaces; we show
 * it on a compact neutral-dark tile so it stays legible on white headers and sidebars.
 */
export function BrandLogo({
  width,
  height,
  className = "",
  wrapperClassName = "",
  priority,
  alt = BRAND_NAME,
}: BrandLogoProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-zinc-900 shadow-sm ring-1 ring-zinc-950/15 ${wrapperClassName}`.trim()}
    >
      <Image
        src={BRAND_LOGO.dark}
        alt={alt}
        width={width}
        height={height}
        className={`object-contain object-center ${className}`.trim()}
        priority={priority}
      />
    </span>
  );
}
