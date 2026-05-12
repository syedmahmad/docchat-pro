/**
 * Best-effort parse of `/api/upload` response body (JSON or short plain text).
 */
export const parseUploadResponseText = (text: string): string | undefined => {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  try {
    const json = JSON.parse(trimmed) as { message?: string; chunks?: number };
    if (typeof json.message === "string") return json.message;
    if (typeof json.chunks === "number") {
      return `The server finished reading your file (${json.chunks} parts).`;
    }
    return undefined;
  } catch {
    if (trimmed.length > 0 && trimmed.length < 280) return trimmed;
    return undefined;
  }
};
