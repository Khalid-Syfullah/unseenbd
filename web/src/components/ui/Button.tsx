import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "./cn";
import { Icon, type IconName } from "./Icon";

/* DESIGN.md §4.3 */

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none tap-target " +
  "transition-[background-color,border-color,color,filter] duration-[var(--dur-1)] ease-standard " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-hover",
  accent: "bg-accent text-on-accent hover:brightness-95 active:brightness-90",
  secondary:
    "border border-border-strong bg-raised text-text hover:bg-surface-2 active:bg-surface-2",
  ghost: "bg-transparent text-on-primary-wash hover:bg-primary-wash active:bg-primary-wash",
  danger: "bg-danger text-on-danger hover:brightness-95 active:brightness-90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-[18px] text-base",
  lg: "h-[52px] px-6 text-lg",
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 16, md: 20, lg: 22 };

export type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** `true`: always full width. `"mobile"`: full width below 768 px (the main action on a view). */
  fullWidth?: boolean | "mobile";
  /** Pill shape instead of the default radius (the header's Log in button). */
  pill?: boolean;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  pill = false,
  className,
}: ButtonStyleProps & { className?: string } = {}): string {
  return cn(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    fullWidth === true && "w-full",
    fullWidth === "mobile" && "w-full md:w-auto md:self-start",
    pill ? "rounded-pill" : "rounded-md",
    className,
  );
}

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}

type ContentProps = {
  icon?: IconName;
  trailingIcon?: IconName;
  loading?: boolean;
  size?: ButtonSize;
  children?: ReactNode;
};

function ButtonContent({ icon, trailingIcon, loading, size = "md", children }: ContentProps) {
  const iconSize = ICON_SIZE[size];
  return (
    <>
      {loading ? (
        <Spinner size={iconSize - 4} />
      ) : icon ? (
        <Icon name={icon} size={iconSize} />
      ) : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} size={iconSize} /> : null}
    </>
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyleProps &
  Omit<ContentProps, "size">;

/** A button. While `loading`, a spinner replaces the leading icon and the label stays. */
export function Button({
  variant,
  size,
  fullWidth,
  pill,
  icon,
  trailingIcon,
  loading = false,
  className,
  children,
  type = "button",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, pill, className })}
      {...rest}
    >
      <ButtonContent icon={icon} trailingIcon={trailingIcon} loading={loading} size={size}>
        {children}
      </ButtonContent>
    </button>
  );
}

export type ButtonLinkProps = ComponentProps<typeof Link> &
  ButtonStyleProps &
  Omit<ContentProps, "size" | "loading">;

/** A link that looks like a button (navigation, not an action). */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  pill,
  icon,
  trailingIcon,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, pill, className })} {...rest}>
      <ButtonContent icon={icon} trailingIcon={trailingIcon} size={size}>
        {children}
      </ButtonContent>
    </Link>
  );
}

const ICON_BUTTON =
  "relative inline-flex size-10 shrink-0 items-center justify-center rounded-md text-text tap-target " +
  "transition-colors duration-[var(--dur-1)] ease-standard hover:bg-surface-2 active:bg-surface-2 " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: IconName;
  /** Required: icon-only buttons are named by their label (DESIGN.md §3). */
  label: string;
  iconSize?: number;
};

/** 40×40 icon-only button (44 px hit area). */
export function IconButton({
  icon,
  label,
  iconSize = 20,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button type={type} aria-label={label} className={cn(ICON_BUTTON, className)} {...rest}>
      <Icon name={icon} size={iconSize} />
    </button>
  );
}

export type IconLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & {
  href: string;
  icon: IconName;
  label: string;
  iconSize?: number;
};

/** An icon-only link (e.g. Facebook in the header). External URLs open in a new tab. */
export function IconLink({ href, icon, label, iconSize = 20, className, ...rest }: IconLinkProps) {
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      className={cn(ICON_BUTTON, className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </a>
  );
}

const TEXT_LINK =
  "relative inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline-offset-4 " +
  "decoration-2 hover:underline disabled:pointer-events-none disabled:opacity-50";

/** A button that looks like a link ("See all →", "Show more"). */
export function LinkButton({
  className,
  children,
  icon,
  trailingIcon,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: IconName; trailingIcon?: IconName }) {
  return (
    <button type={type} className={cn(TEXT_LINK, className)} {...rest}>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} size={18} /> : null}
    </button>
  );
}

/** A styled text link with an optional trailing arrow ("See all →"). */
export function TextLink({
  className,
  children,
  icon,
  trailingIcon,
  ...rest
}: ComponentProps<typeof Link> & { icon?: IconName; trailingIcon?: IconName }) {
  return (
    <Link className={cn(TEXT_LINK, className)} {...rest}>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} size={18} /> : null}
    </Link>
  );
}
