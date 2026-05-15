/** Same rules as the upload UI: PDF MIME and/or `.pdf` with common browser MIME quirks. */
export const isPdfFile = (file: File): boolean => {
  const lower = file.name.toLowerCase();
  const hasPdfExtension = lower.endsWith(".pdf");
  const mime = file.type;
  const mimeOkWithPdfExtension =
    mime === "application/pdf" ||
    mime === "application/octet-stream" ||
    mime === "";

  return (
    mime === "application/pdf" ||
    (hasPdfExtension && mimeOkWithPdfExtension)
  );
};
