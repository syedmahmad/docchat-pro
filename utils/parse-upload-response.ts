export type ParsedUploadResponse = {
  successDetail?: string;
  errorMessage?: string;
};

/**
 * Parses JSON from `POST /api/upload` (success: message/pages/chunks; errors: error).
 */
export const parseUploadResponse = (
  text: string,
  isSuccessStatus: boolean,
): ParsedUploadResponse => {
  const trimmed = text.trim();
  if (!trimmed) return {};

  try {
    const json = JSON.parse(trimmed) as {
      error?: unknown;
      debug?: unknown;
      message?: unknown;
      pages?: unknown;
      chunks?: unknown;
    };

    if (typeof json.error === "string") {
      const debug =
        typeof json.debug === "string" ? ` (${json.debug})` : "";
      return { errorMessage: `${json.error}${debug}` };
    }

    if (
      isSuccessStatus &&
      (typeof json.message === "string" ||
        typeof json.pages === "number" ||
        typeof json.chunks === "number")
    ) {
      const segments: string[] = [];
      if (typeof json.message === "string") segments.push(json.message);
      if (typeof json.pages === "number") {
        segments.push(
          `${json.pages} page${json.pages === 1 ? "" : "s"}`,
        );
      }
      if (typeof json.chunks === "number") {
        segments.push(
          `${json.chunks} section${json.chunks === 1 ? "" : "s"}`,
        );
      }
      return { successDetail: segments.join(" · ") };
    }

    return {};
  } catch {
    if (trimmed.length > 0 && trimmed.length < 280) {
      return isSuccessStatus
        ? { successDetail: trimmed }
        : { errorMessage: trimmed };
    }
    return {};
  }
};
