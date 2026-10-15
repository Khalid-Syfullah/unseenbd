"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale, useT } from "@/i18n/client";
import { contentLocale } from "@/i18n/locales";

const subscribe = () => () => {};
const supported = () => typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Reads the introduction aloud with the browser's speech synthesis in the page language
 * (Bengali or English). The whole block is left out when the browser cannot speak.
 */
export function ListenButton({ text }: { text: string }) {
  const t = useT();
  const lang = contentLocale(useLocale());
  const canSpeak = useSyncExternalStore(subscribe, supported, () => false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (supported()) window.speechSynthesis.cancel();
    };
  }, []);

  if (!canSpeak) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "bn" ? "bn-BD" : "en-US";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  }

  return (
    <section aria-labelledby="listen-title" className="flex flex-col gap-3">
      <h2 id="listen-title" className="text-h2 text-balance">
        {t("place.listenTitle")}
      </h2>
      <Button
        variant="secondary"
        icon={speaking ? "close" : "speaker"}
        aria-pressed={speaking}
        onClick={toggle}
        className="w-fit"
      >
        {speaking ? t("place.listenStop") : t("place.listenPlay")}
      </Button>
    </section>
  );
}
