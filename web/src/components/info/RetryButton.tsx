"use client";

import { Button } from "@/components/ui/Button";

/** Reloads the page the visitor was trying to reach. */
export function RetryButton({ label }: { label: string }) {
  return (
    <Button icon="arrow-right" onClick={() => window.location.reload()}>
      {label}
    </Button>
  );
}
