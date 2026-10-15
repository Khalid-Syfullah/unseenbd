"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n/client";
import { copyText } from "@/lib/share";

type Fix = { lat: number; lng: number; accuracy: number };
type State =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "ok"; fix: Fix }
  | { kind: "error"; message: string };

/**
 * "Share my location" (FEATURES.md §4.7): reads the position in the browser, builds a map link
 * and hands it to the share sheet or the clipboard. Nothing is sent to our servers.
 */
export function ShareLocation() {
  const t = useT();
  const toast = useToast();
  const [state, setState] = useState<State>({ kind: "idle" });

  function find() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ kind: "error", message: t("safety.locUnsupported") });
      return;
    }
    setState({ kind: "busy" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          kind: "ok",
          fix: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
          },
        }),
      (err) =>
        setState({
          kind: "error",
          message:
            err.code === err.PERMISSION_DENIED ? t("safety.locDenied") : t("safety.locUnavailable"),
        }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  const fix = state.kind === "ok" ? state.fix : null;
  const url = fix
    ? `https://www.openstreetmap.org/?mlat=${fix.lat.toFixed(6)}&mlon=${fix.lng.toFixed(6)}#map=17/${fix.lat.toFixed(6)}/${fix.lng.toFixed(6)}`
    : "";

  async function share() {
    if (!fix) return;
    const text = t("safety.locShareText", { url });
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: t("safety.locTitle"), text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    if (await copyText(text)) toast.show(t("safety.locCopied"), { tone: "success" });
  }

  async function copy() {
    if (await copyText(url)) toast.show(t("safety.locCopied"), { tone: "success" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button icon="pin" onClick={find} loading={state.kind === "busy"}>
          {state.kind === "busy" ? t("safety.locBusy") : t("safety.locGet")}
        </Button>
      </div>
      <div aria-live="polite" className="flex flex-col gap-3">
        {state.kind === "error" ? <p className="text-danger">{state.message}</p> : null}
        {fix ? (
          <>
            <p className="num">
              {t("safety.locPosition", {
                lat: fix.lat.toFixed(5),
                lng: fix.lng.toFixed(5),
                accuracy: fix.accuracy,
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" icon="share" onClick={share}>
                {t("safety.locShare")}
              </Button>
              <Button variant="secondary" icon="copy" onClick={copy}>
                {t("safety.locCopy")}
              </Button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 px-2 text-primary underline-offset-2 hover:underline"
              >
                {t("safety.locOpen")}
              </a>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
