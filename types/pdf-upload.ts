export type PdfUploadState =
  | { status: "idle" }
  | { status: "uploading"; fileName: string }
  | { status: "success"; fileName: string; detail?: string; sourceId?: string }
  | { status: "error"; message: string };
