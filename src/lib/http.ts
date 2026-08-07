export class PayloadTooLargeError extends Error {
  constructor() {
    super("Request body is too large");
    this.name = "PayloadTooLargeError";
  }
}

export async function readJsonWithLimit(request: Request, maxBytes: number): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new PayloadTooLargeError();
  if (!request.body) throw new SyntaxError("Request body is required");

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let body = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new PayloadTooLargeError();
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  return JSON.parse(body) as unknown;
}
