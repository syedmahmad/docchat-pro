export type PdfUploadState =
  | { status: "idle" }
  | { status: "uploading"; fileName: string }
  | { status: "success"; fileName: string; detail?: string }
  | { status: "error"; message: string };
