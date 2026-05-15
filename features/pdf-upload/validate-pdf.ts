import { MAX_BYTES } from "@/constants/pdf-upload";
import { formatBytes } from "@/utils/format-bytes";
import { isPdfFile } from "@/utils/is-pdf-file";

/** Returns a user-facing error message, or `null` if the file is acceptable. */
export const validatePdf = (file: File): string | null => {
  if (!isPdfFile(file)) {
    return "Only PDF files are supported.";
  }
  if (file.size > MAX_BYTES) {
    return `File is too large. Maximum size is ${formatBytes(MAX_BYTES)} (this file is ${formatBytes(file.size)}).`;
  }
  if (file.size === 0) {
    return "This file appears to be empty.";
  }
  return null;
};
