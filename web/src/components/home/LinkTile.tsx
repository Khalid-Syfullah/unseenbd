import { CARD, CARD_LIFT, CardLink } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { Icon, type IconName } from "@/components/ui/Icon";

/** A short tile that is one link: icon in a tinted circle, title and an optional line below. */
export function LinkTile({
  href,
  icon,
  title,
  body,
  tone = "primary",
  className,
}: {
  href: string;
  icon: IconName;
  title: string;
  body?: string;
  /** `accent` is for "add" tiles (the owner submission links). */
  tone?: "primary" | "accent";
  className?: string;
}) {
  return (
    <article className={cn(CARD, CARD_LIFT, "flex-row items-center gap-3 p-4", className)}>
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-pill",
          tone === "accent" ? "bg-accent-wash text-on-accent-wash" : "bg-primary-wash text-primary",
        )}
      >
        <Icon name={icon} size={22} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-base font-semibold">
          <CardLink href={href}>{title}</CardLink>
        </h3>
        {body ? <p className="text-sm text-muted">{body}</p> : null}
      </div>
      <Icon
        name="arrow-right"
        size={20}
        className="text-primary transition-transform duration-[var(--dur-2)] ease-standard group-hover/card:translate-x-0.5"
      />
    </article>
  );
}
