/**
 * State machine type for the URL upload flow.
 *
 * This mirrors the PdfUploadState shape so both upload flows
 * can share the same status component patterns.
 *
 * idle      → user has not started anything yet
 * submitting → we are fetching + processing the URL
 * success   → URL was ingested and saved to the vector store
 * error     → something went wrong; message tells the user what
 */
export type UrlUploadState =
  | { status: "idle" }
  | { status: "submitting"; url: string }
  | { status: "success"; url: string; detail?: string }
  | { status: "error"; message: string };
