/** Multipart field name — keep in sync with `/api/upload` on the backend. */
export const UPLOAD_FIELD = "file";

export const UPLOAD_URL = "/api/upload";

/**
 * Vercel Functions hard-cap request bodies at 4.5 MB (infra-level, not
 * configurable). Stay comfortably under that so direct PDF uploads never
 * fail with 413 in production.
 */
export const MAX_BYTES = 4 * 1024 * 1024;

export const ACCEPT = "application/pdf,.pdf";
