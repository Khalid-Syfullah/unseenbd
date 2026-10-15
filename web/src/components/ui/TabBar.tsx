"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import { isActivePath, TAB_ITEMS } from "@/lib/nav";
import { cn } from "./cn";
import { Icon } from "./Icon";

/**
 * Bottom tab bar (DESIGN.md §4.2): Home · My Bangladesh · Explore · Planner · Gallery. Always
 * visible; on wide screens it is centred, 560 px wide, with rounded top corners. The active tab
 * (from the current URL) is primary, with a 24×3 pill above its icon and `aria-current="page"`.
 */
export function TabBar({
  pathname: pathnameProp,
  fixed = true,
}: {
  /** The current path (defaults to the router's). */
  pathname?: string;
  /** Fixed to the bottom of the screen (off only for previews). */
  fixed?: boolean;
} = {}) {
  const t = useT();
  const locale = useLocale();
  const routerPath = usePathname();
  const pathname = pathnameProp ?? routerPath ?? "/";

  return (
    <nav
      aria-label={t("nav.tabBar")}
      className={cn(
        "border-t border-border bg-raised",
        fixed ? "fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]" : "relative",
        "md:mx-auto md:max-w-[560px] md:rounded-t-xl md:border-x md:shadow-2",
      )}
    >
      <ul className="grid h-[var(--tabbar-h)] grid-cols-5">
        {TAB_ITEMS.map((item) => {
          const active = isActivePath(item.path, pathname);
          return (
            <li key={item.path} className="flex">
              <Link
                href={localePath(locale, item.path)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-w-16 flex-1 flex-col items-center justify-start gap-0.5 px-1 pt-2.5 text-xs font-semibold",
                  "transition-colors duration-[var(--dur-1)] ease-standard focus-visible:-outline-offset-3",
                  active ? "text-primary" : "text-muted hover:text-text",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1 h-[3px] w-6 rounded-pill bg-primary transition-opacity duration-[var(--dur-2)] ease-standard",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                {item.icon ? <Icon name={item.icon} size={24} /> : null}
                <span className="line-clamp-2 max-w-full text-center leading-[1.15]">
                  {t(item.label)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
