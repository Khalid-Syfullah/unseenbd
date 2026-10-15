/**
 * Exports for the card: PNG (download or the share sheet) and short videos recorded from the
 * canvas with `MediaRecorder`. Each feature is detected first, so the UI can hide what a browser
 * cannot do instead of failing.
 */
import { VIDEO_FPS, VIDEO_SECONDS } from "./animate";

/** The canvas as a PNG. */
export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

/** Saves a blob as a file through a temporary link. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari needs the URL a moment longer than the click.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** True when the share sheet accepts image files (most phones, Safari, Edge). */
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  try {
    const probe = new File([new Uint8Array([137, 80, 78, 71])], "card.png", { type: "image/png" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export type FileShareResult = "shared" | "cancelled" | "unsupported" | "failed";

/** Opens the share sheet with a file (and optional text). */
export async function shareFile(
  blob: Blob,
  filename: string,
  text?: string,
): Promise<FileShareResult> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function")
    return "unsupported";
  const file = new File([blob], filename, { type: blob.type });
  if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
    return "unsupported";
  }
  try {
    await navigator.share(text ? { files: [file], text } : { files: [file] });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    return "failed";
  }
}

/** Containers to try, best first. WebM is the goal; MP4 covers Safari versions without it. */
const VIDEO_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
] as const;

export type VideoFormat = { mimeType: string; extension: "webm" | "mp4"; label: "WEBM" | "MP4" };

/**
 * The video format this browser can record from a canvas, or null (then the video buttons are
 * hidden).
 */
export function videoFormat(): VideoFormat | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  if (
    typeof HTMLCanvasElement === "undefined" ||
    !("captureStream" in HTMLCanvasElement.prototype)
  ) {
    return null;
  }
  const isSupported = (t: string) => {
    try {
      return MediaRecorder.isTypeSupported(t);
    } catch {
      return false;
    }
  };
  const mimeType = VIDEO_TYPES.find(isSupported);
  if (!mimeType) return null;
  const webm = mimeType.startsWith("video/webm");
  return { mimeType, extension: webm ? "webm" : "mp4", label: webm ? "WEBM" : "MP4" };
}

export type RecordOptions = {
  format: VideoFormat;
  /** Draws the frame at `t` (0–1 of the clip) onto the canvas. */
  draw: (t: number) => void;
  seconds?: number;
  onProgress?: (t: number) => void;
  /** Stops early; the promise rejects with an AbortError. */
  signal?: AbortSignal;
};

/**
 * Records the canvas while `draw` animates it, and resolves with the video. Frames follow the
 * clock, so a slow device drops frames instead of making a longer video.
 */
export function recordCanvas(canvas: HTMLCanvasElement, opts: RecordOptions): Promise<Blob> {
  const seconds = opts.seconds ?? VIDEO_SECONDS;
  return new Promise<Blob>((resolve, reject) => {
    let stream: MediaStream;
    let recorder: MediaRecorder;
    try {
      opts.draw(0);
      stream = canvas.captureStream(VIDEO_FPS);
      recorder = new MediaRecorder(stream, {
        mimeType: opts.format.mimeType,
        videoBitsPerSecond: 8_000_000,
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    const chunks: Blob[] = [];
    let raf = 0;
    let aborted = false;
    const stopTracks = () => stream.getTracks().forEach((track) => track.stop());
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    recorder.onerror = () => {
      cancelAnimationFrame(raf);
      stopTracks();
      reject(new Error("recording failed"));
    };
    recorder.onstop = () => {
      stopTracks();
      if (aborted) {
        reject(new DOMException("Recording cancelled", "AbortError"));
        return;
      }
      const type = opts.format.mimeType.split(";")[0]!;
      resolve(new Blob(chunks, { type }));
    };
    opts.signal?.addEventListener(
      "abort",
      () => {
        aborted = true;
        cancelAnimationFrame(raf);
        if (recorder.state !== "inactive") recorder.stop();
      },
      { once: true },
    );

    recorder.start(250);
    const start = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / (seconds * 1000));
      opts.draw(t);
      opts.onProgress?.(t);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // Hold the last frame briefly so it makes it into the file.
        window.setTimeout(() => {
          if (recorder.state !== "inactive") recorder.stop();
        }, 200);
      }
    };
    raf = requestAnimationFrame(tick);
  });
}

/** `unseen-bd-map-square.png` and friends. */
export function exportName(parts: string[], extension: string): string {
  const slug = parts
    .map((p) =>
      p
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    )
    .filter(Boolean)
    .join("-");
  return `unseen-bd-${slug || "card"}.${extension}`;
}
