"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLocale, useT } from "@/i18n/client";
import { localePath } from "@/i18n/locales";
import { isActivePath, MENU_SECTIONS } from "@/lib/nav";
import { setThemePref } from "@/lib/theme";
import { cn } from "./cn";
import { Sheet } from "./Dialog";
import { Icon } from "./Icon";

/** Sticky header bar; gets its bottom hairline once the page has scrolled 8 px. */
export function HeaderShell({
  children,
  sticky = true,
  className,
}: {
  children: ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cn(
        "z-40 border-b bg-raised/92 backdrop-blur-md transition-[border-color] duration-[var(--dur-2)] ease-standard",
        sticky ? "sticky top-0" : "relative",
        scrolled || !sticky ? "border-border" : "border-transparent",
        className,
      )}
    >
      {children}
    </header>
  );
}

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const readTheme = () => document.documentElement.getAttribute("data-theme") === "dark";

const HEADER_BUTTON =
  "relative inline-flex size-10 shrink-0 items-center justify-center rounded-md text-text tap-target " +
  "transition-colors duration-[var(--dur-1)] ease-standard hover:bg-surface-2";

/**
 * Light/dark switch (DESIGN.md §4.1): 40×40, `role="switch"`, moon in light, sun in dark. The
 * choice is saved in the `theme` cookie. Both icons are rendered and CSS shows the right one, so
 * there is no flash before hydration.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const t = useT();
  const dark = useSyncExternalStore(subscribeTheme, readTheme, () => false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={t("header.darkTheme")}
      title={t("header.darkTheme")}
      onClick={() => setThemePref(dark ? "light" : "dark")}
      className={cn(HEADER_BUTTON, className)}
    >
      <Icon name="moon" size={20} className="dark:hidden" />
      <Icon name="sun" size={20} className="hidden dark:block" />
    </button>
  );
}

/** ☰ button and the menu: a right sheet on phones, a 360 px dropdown panel from 768 px. */
export function MenuButton({ className }: { className?: string }) {
  const t = useT();
  const locale = useLocale();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const menuId = useId();

  return (
    <>
      <button
        type="button"
        aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className={cn(HEADER_BUTTON, className)}
      >
        <Icon name="menu" size={22} />
      </button>
      <Sheet
        id={menuId}
        open={open}
        onClose={() => setOpen(false)}
        title={t("nav.menu")}
        dropdownFrom
      >
        <nav aria-label={t("nav.mainMenu")} className="flex flex-col py-2">
          {MENU_SECTIONS.map((section, i) => (
            <section
              key={section.title}
              className={cn("px-3 py-2", i > 0 && "border-t border-border")}
            >
              <h3 className="px-2 pt-1 pb-1.5 text-xs font-semibold text-muted">
                {t(section.title)}
              </h3>
              <ul className="grid grid-cols-2 gap-x-1">
                {section.items.map((item) => {
                  const active = !item.path.includes("#") && isActivePath(item.path, pathname);
                  return (
                    <li key={item.path}>
                      <Link
                        href={localePath(locale, item.path)}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-2 rounded-sm px-2 text-sm font-semibold",
                          "transition-colors duration-[var(--dur-1)] ease-standard",
                          active ? "bg-primary-wash text-primary" : "text-text hover:bg-surface-2",
                        )}
                      >
                        {item.icon ? (
                          <Icon
                            name={item.icon}
                            size={18}
                            className={active ? "text-primary" : "text-muted"}
                          />
                        ) : null}
                        <span className="min-w-0">{t(item.label)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      </Sheet>
    </>
  );
}
