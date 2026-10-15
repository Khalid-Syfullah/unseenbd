import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_SCRIPT } from "./theme";

function mockSystem(dark: boolean) {
  const listeners: Array<() => void> = [];
  const mq = {
    matches: dark,
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mq),
  );
  return {
    change(next: boolean) {
      mq.matches = next;
      listeners.forEach((fn) => fn());
    },
  };
}

function runScript() {
  new Function(THEME_SCRIPT)();
}

describe("THEME_SCRIPT (no-flash theme)", () => {
  const html = document.documentElement;

  beforeEach(() => {
    html.removeAttribute("data-theme");
    html.removeAttribute("data-theme-pref");
    document.cookie = "theme=; Max-Age=0; Path=/";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.__setThemePref;
  });

  it("follows the system when there is no cookie", () => {
    const system = mockSystem(true);
    runScript();
    expect(html.dataset.themePref).toBe("system");
    expect(html.dataset.theme).toBe("dark");
    system.change(false);
    expect(html.dataset.theme).toBe("light");
  });

  it("uses the cookie when set", () => {
    mockSystem(true);
    document.cookie = "theme=light; Path=/";
    runScript();
    expect(html.dataset.themePref).toBe("light");
    expect(html.dataset.theme).toBe("light");
  });

  it("ignores system changes once a theme is chosen", () => {
    const system = mockSystem(false);
    runScript();
    window.__setThemePref?.("dark");
    expect(html.dataset.theme).toBe("dark");
    expect(document.cookie).toContain("theme=dark");
    system.change(false);
    expect(html.dataset.theme).toBe("dark");
  });
});
