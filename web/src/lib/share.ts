/** Sharing helpers for the browser: the Web Share API with a copy-link fallback. */

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/** Copies text to the clipboard; false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Opens the share sheet when there is one, otherwise copies the link. */
export async function shareOrCopy(data: { title: string; url: string }): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // fall through to copying
    }
  }
  return (await copyText(data.url)) ? "copied" : "failed";
}
