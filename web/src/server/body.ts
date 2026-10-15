/**
 * Request bodies with a hard size cap. Route handlers have no body limit of their own, so
 * reading `request.text()` first and checking afterwards would let one request fill the memory.
 * A declared `Content-Length` over the cap is refused before anything is read; a body without one
 * (chunked) is read only until it passes the cap. nginx's `client_max_body_size` is the outer
 * limit (DEPLOY.md).
 */

/** The body as text, or null when it is (or claims to be) larger than `maxBytes`. */
export async function readTextCapped(request: Request, maxBytes: number): Promise<string | null> {
  const declared = request.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
