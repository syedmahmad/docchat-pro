import axios from "axios";

import {
  UPLOAD_FIELD,
  UPLOAD_URL,
} from "@/constants/pdf-upload";
import { parseUploadResponse } from "@/utils/parse-upload-response";

export type PostPdfUploadResult =
  | { type: "success"; detail?: string }
  | { type: "http_error"; status: number; detail?: string }
  | { type: "network_error"; message: string };

const NETWORK_MESSAGE =
  "We could not reach the server. Check your connection and try again.";

export const postPdfUpload = async (
  file: File,
): Promise<PostPdfUploadResult> => {
  const body = new FormData();
  body.append(UPLOAD_FIELD, file);

  try {
    const response = await axios.post<string>(UPLOAD_URL, body, {
      validateStatus: () => true,
      responseType: "text",
    });

    const text = response.data ?? "";
    const isSuccess = response.status >= 200 && response.status < 300;
    const parsed = parseUploadResponse(text, isSuccess);

    if (!isSuccess) {
      return {
        type: "http_error",
        status: response.status,
        detail: parsed.errorMessage,
      };
    }

    return { type: "success", detail: parsed.successDetail };
  } catch {
    return { type: "network_error", message: NETWORK_MESSAGE };
  }
};
