import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { UploadForm } from "@/components/community/UploadForm";
import { getT } from "@/i18n/messages";
import { resetAccountForTests } from "@/lib/account/client";
import { ORIGINAL_BYTES_MAX } from "@/lib/community/rules";
import { hasMetadata, sniffImage } from "@/lib/media/image-bytes";
import { fitWithin, prepareImage, PrepareImageError, type PipelineDeps } from "@/lib/media/prepare";
import { resetAuthLimits } from "@/server/auth/limits";
import { resetCommunityLimits } from "@/server/community/http";
import { getDb } from "@/server/db/client";
import { photos } from "@/server/db/schema";
import { TestBrowser } from "./account-helpers";
import { renderWithI18n } from "./i18n";
import { contains, GPS_MARKER, jpegWithGps, TINY_JPEG } from "./media-fixtures";

const en = getT("en");

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const bytesOf = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());

/**
 * A stand-in for the canvas: "decodes" any file as a 4000×3000 image and "encodes" by returning
 * a real JPEG. To prove the last check works it even returns one with a GPS block, as a broken
 * browser might; and like Safari it answers a WebP request with something else (here JPEG).
 */
function fakePipeline(calls: [number, number, string][] = []): PipelineDeps {
  return {
    decode: async () => ({ source: {} as CanvasImageSource, width: 4000, height: 3000 }),
    encode: async (_img, width, height, type) => {
      calls.push([width, height, type]);
      return new Blob([jpegWithGps() as BlobPart], { type: "image/jpeg" });
    },
  };
}

describe("the in-browser pipeline", () => {
  it("fits photos within 2000 px and thumbnails within 480 px, never upscaling", () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(1080, 1920, 2000)).toEqual({ width: 1080, height: 1920 });
    expect(fitWithin(3000, 4000, 480)).toEqual({ width: 360, height: 480 });
  });

  it("re-encodes the photo and removes any metadata before it can be sent", async () => {
    const calls: [number, number, string][] = [];
    const original = new File([jpegWithGps() as BlobPart], "IMG_0001.jpg", { type: "image/jpeg" });
    const prepared = await prepareImage(original, fakePipeline(calls));
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.width).toBe(2000);
    expect(prepared.height).toBe(1500);
    // WebP first; this "browser" cannot write WebP, so JPEG.
    expect(calls[0]).toEqual([2000, 1500, "image/webp"]);
    expect(calls[1]).toEqual([2000, 1500, "image/jpeg"]);
    expect(calls).toContainEqual([480, 360, "image/jpeg"]);
    for (const blob of [prepared.photo, prepared.thumb]) {
      const bytes = await bytesOf(blob);
      expect(sniffImage(bytes)?.type).toBe("image/jpeg");
      expect(hasMetadata(bytes)).toBe(false);
      expect(contains(bytes, GPS_MARKER)).toBe(false);
      expect(contains(bytes, "Exif")).toBe(false);
    }
  });

  it("refuses files that are not images or are far too large", async () => {
    const text = new File(["hello"], "notes.txt", { type: "text/plain" });
    await expect(prepareImage(text, fakePipeline())).rejects.toMatchObject({ code: "not_image" });
    const huge = new File([TINY_JPEG as BlobPart], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(huge, "size", { value: ORIGINAL_BYTES_MAX + 1 });
    await expect(prepareImage(huge, fakePipeline())).rejects.toBeInstanceOf(PrepareImageError);
    const broken: PipelineDeps = {
      ...fakePipeline(),
      decode: async () => {
        throw new Error("cannot decode");
      },
    };
    const heic = new File([TINY_JPEG as BlobPart], "IMG.HEIC", { type: "image/heic" });
    await expect(prepareImage(heic, broken)).rejects.toMatchObject({ code: "decode" });
  });
});

describe("/upload form", () => {
  let mediaRoot: string;
  const browser = new TestBrowser();
  const sent: FormData[] = [];

  beforeAll(() => {
    mediaRoot = mkdtempSync(join(tmpdir(), "ubd-upload-"));
    process.env.MEDIA_DIR = mediaRoot;
  });
  afterAll(() => {
    rmSync(mediaRoot, { recursive: true, force: true });
    delete process.env.MEDIA_DIR;
  });
  beforeEach(() => {
    resetAuthLimits();
    resetCommunityLimits();
    resetAccountForTests();
    sent.length = 0;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body && typeof init.body === "object" && "entries" in init.body) {
        sent.push(init.body as FormData);
      }
      return browser.fetch(input, init);
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const divisions = [
    {
      slug: "chattogram",
      name: "Chattogram",
      districts: [{ slug: "bandarban", name: "Bandarban" }],
    },
  ];
  const places = [{ slug: "nilgiri-hill", name: "Nilgiri Hill", district: "bandarban" }];

  it("sends only the re-encoded copies: a JPEG with GPS EXIF arrives without EXIF", async () => {
    const user = userEvent.setup();
    const { container } = renderWithI18n(
      <UploadForm divisions={divisions} places={places} pipeline={fakePipeline()} />,
    );
    expect(await screen.findByText(en("upload.quotaLeft", { count: 2 }))).toBeInTheDocument();

    const original = new File([jpegWithGps() as BlobPart], "IMG_0042.jpg", {
      type: "image/jpeg",
    });
    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, original);
    expect(
      await screen.findByAltText(en("upload.preview", { name: "IMG_0042.jpg" })),
    ).toBeVisible();

    await user.type(screen.getByLabelText(en("upload.name")), "Shirin");
    await user.selectOptions(screen.getByLabelText(en("upload.district")), "bandarban");
    await user.type(screen.getByLabelText(new RegExp(en("upload.place"))), "Nilgiri Hill");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: en("upload.submit", { count: 1 }) }));

    expect(await screen.findByText(en("upload.doneBody", { count: 1 }))).toBeInTheDocument();
    expect(screen.getByText(en("upload.quotaLeft", { count: 1 }))).toBeInTheDocument();

    // What left the "browser": the prepared copies only, never the original bytes.
    expect(sent).toHaveLength(1);
    const form = sent[0]!;
    expect(form.get("place")).toBe("nilgiri-hill");
    for (const [, value] of form.entries()) {
      if (typeof value === "string") continue;
      const bytes = await bytesOf(value);
      expect(contains(bytes, GPS_MARKER)).toBe(false);
      expect(contains(bytes, "Exif")).toBe(false);
    }

    // What the server stored.
    const row = getDb().select().from(photos).where(eq(photos.uploaderName, "Shirin")).get()!;
    expect(row.status).toBe("pending");
    const stored = new Uint8Array(readFileSync(join(mediaRoot, row.src.replace("/media/", ""))));
    expect(hasMetadata(stored)).toBe(false);
    expect(contains(stored, GPS_MARKER)).toBe(false);
  });

  it("checks the form before sending anything", async () => {
    const user = userEvent.setup();
    renderWithI18n(<UploadForm divisions={divisions} places={places} pipeline={fakePipeline()} />);
    await user.click(
      await screen.findByRole("button", { name: en("upload.submit", { count: 1 }) }),
    );
    expect(screen.getByText(en("upload.needName"))).toBeInTheDocument();
    expect(screen.getByText(en("upload.needDistrict"))).toBeInTheDocument();
    expect(screen.getByText(en("upload.needPhoto", { max: 3 }))).toBeInTheDocument();
    expect(screen.getByText(en("upload.needConsent"))).toBeInTheDocument();
    await waitFor(() => expect(sent).toHaveLength(0));
  });
});
