/**
 * Client-side service for submitting a URL to the ingestion pipeline.
 *
 * This mirrors post-pdf-upload.ts: it sends data to the server,
 * normalises the result into one of three typed outcomes, and never
 * throws — callers can switch on `result.type` without try/catch.
 */

import axios from "axios";

// The API endpoint constant is kept in one place so a rename is a one-line change
import { UPLOAD_URL_ENDPOINT } from "@/constants/url-upload";

// Reuse the same response parser used for PDF uploads — the JSON shape is identical
import { parseUploadResponse } from "@/utils/parse-upload-response";

/**
 * All possible outcomes of a URL upload attempt.
 *
 * Using a discriminated union (instead of throwing) lets callers
 * handle each case explicitly with a simple switch/if chain.
 */
export type PostUrlUploadResult =
  | { type: "success"; detail?: string }
  | { type: "http_error"; status: number; detail?: string }
  | { type: "network_error"; message: string };

// Shown to the user when the device has no network connection or the server is down
const NETWORK_MESSAGE =
  "We could not reach the server. Check your connection and try again.";

/**
 * POSTs the URL as JSON to /api/upload-url and returns a typed result.
 *
 * Why JSON instead of FormData?
 * There is no file to send — just a string — so JSON is the simplest
 * and most explicit format for this particular endpoint.
 */
export const postUrlUpload = async (
  url: string,
): Promise<PostUrlUploadResult> => {
  try {
    // Send the URL string in a JSON body so the server can parse it with request.json()
    const response = await axios.post<string>(
      UPLOAD_URL_ENDPOINT,
      { url }, // the body — server reads this as { url: string }
      {
        // Return false for all status codes so axios doesn't throw on 4xx/5xx.
        // We inspect response.status ourselves below to return the right union variant.
        validateStatus: () => true,

        // Ask axios to return the raw text body (not parsed JSON).
        // parseUploadResponse handles the JSON parsing with error boundaries.
        responseType: "text",

        // Explicitly declare content type — the server reads this to parse the body correctly
        headers: { "Content-Type": "application/json" },
      },
    );

    // Empty string fallback avoids null-reference errors in parseUploadResponse
    const text = response.data ?? "";

    // Anything in the 200–299 range is a success at the HTTP level
    const isSuccess = response.status >= 200 && response.status < 300;

    // Delegate JSON parsing and message extraction to the shared response parser
    const parsed = parseUploadResponse(text, isSuccess);

    // Non-2xx response — server rejected the request or encountered a controlled error
    if (!isSuccess) {
      return {
        type: "http_error",
        status: response.status,
        detail: parsed.errorMessage,
      };
    }

    // HTTP 2xx — ingestion succeeded
    return { type: "success", detail: parsed.successDetail };
  } catch {
    // axios only throws here when the network itself failed (DNS failure, timeout, CORS, etc.)
    // — NOT for HTTP error status codes because we set validateStatus above
    return { type: "network_error", message: NETWORK_MESSAGE };
  }
};
