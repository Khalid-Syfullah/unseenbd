import type { SVGProps } from "react";
import { ICONS, type IconName } from "./icons.generated";

export type { IconName };

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export function isIconName(value: unknown): value is IconName {
  return typeof value === "string" && value in ICONS;
}

type Props = Omit<SVGProps<SVGSVGElement>, "name" | "children"> & {
  name: IconName;
  /** Width and height in px. Default 24 (the icons' own grid). */
  size?: number;
  /**
   * Accessible name. Without it the icon is decorative (`aria-hidden`), which is right whenever a
   * visible label sits next to it; icon-only buttons put their label on the button instead.
   */
  label?: string;
};

/**
 * An icon from `assets/icons` (ui, kinds, kinds-badge), inlined as SVG. Line icons draw in
 * `currentColor`, so they take the text colour of their parent; badges keep their own colours.
 */
export function Icon({ name, size = 24, label, className, ...rest }: Props) {
  const icon = ICONS[name];
  const strokeProps = icon.stroke
    ? {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
      }
    : {};
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={icon.viewBox}
      width={size}
      height={size}
      focusable="false"
      className={className ? `shrink-0 ${className}` : "shrink-0"}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      {...strokeProps}
      {...rest}
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}

/** A down-pointing chevron (selects, accordions, dropdowns); rotate it with a class. */
export function Chevron({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `shrink-0 ${className}` : "shrink-0"}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
