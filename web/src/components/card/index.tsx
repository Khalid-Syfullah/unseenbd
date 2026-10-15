"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import type { CardMakerProps } from "./CardMaker";

export type { CardMakerProps } from "./CardMaker";

function CardMakerSkeleton() {
  const t = useT();
  return (
    <div className="grid gap-6 lg:grid-cols-2" aria-busy="true">
      <div className="aspect-square w-full rounded-lg shimmer bg-surface-2" />
      <div className="flex flex-col gap-3">
        <div className="h-11 rounded-md shimmer bg-surface-2" />
        <div className="h-24 rounded-md shimmer bg-surface-2" />
        <div className="h-11 rounded-md shimmer bg-surface-2" />
        <p role="status" className="text-sm text-muted">
          {t("card.drawing")}
        </p>
      </div>
    </div>
  );
}

const CardMaker = dynamic(() => import("./CardMaker").then((m) => m.CardMaker), {
  ssr: false,
  loading: () => <CardMakerSkeleton />,
});

/**
 * The card maker, loaded only when its section comes near the screen: the renderer, the map
 * geometry and the fonts it needs stay off the first page load.
 */
export function CardMakerLazy(props: CardMakerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const anchor = el.closest("section")?.id;
    if (anchor && window.location.hash === `#${anchor}`) {
      setNear(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      // Very old browsers: load on the first scroll instead.
      const onScroll = () => setNear(true);
      window.addEventListener("scroll", onScroll, { once: true, passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  return <div ref={ref}>{near ? <CardMaker {...props} /> : <CardMakerSkeleton />}</div>;
}
