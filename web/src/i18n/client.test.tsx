import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider, useLocale, useT } from "./client";
import { getMessages } from "./messages";

function Probe() {
  const t = useT();
  const locale = useLocale();
  return (
    <p>
      {locale}: {t("nav.explore")} · {t("common.places", { count: 3 })}
    </p>
  );
}

describe("useT()", () => {
  it("translates in client components below the provider", () => {
    render(
      <I18nProvider locale="bn" messages={getMessages("bn")}>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByText("bn: ঘুরে দেখুন · ৩টি জায়গা")).toBeInTheDocument();
  });

  it("throws without a provider", () => {
    expect(() => render(<Probe />)).toThrow(/I18nProvider/);
  });
});
