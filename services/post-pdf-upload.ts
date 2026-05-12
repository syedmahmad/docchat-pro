import axios from "axios";

import {
  UPLOAD_FIELD,
  UPLOAD_URL,
} from "@/constants/pdf-upload";
import { parseUploadResponseText } from "@/utils/parse-upload-response-text";

export type PostPdfUploadResult =
  | { type: "success"; detail?: string }
  | { type: "http_error"; status: number; detail?: string }
  | { type: "network_error"; message: string };

const NETWORK_MESSAGE =
  "We could not reach the server. Check your connection and try again.";

export const postPdfUpload = async (
  file: File
): Promise<PostPdfUploadResult> => {
  const body = new FormData();
  body.append(UPLOAD_FIELD, file);

  try {
    const response = await axios.post<string>(UPLOAD_URL, body, {
      validateStatus: () => true,
      responseType: "text",
    });

    const detail = parseUploadResponseText(response.data ?? "");

    if (response.status < 200 || response.status >= 300) {
      return { type: "http_error", status: response.status, detail };
    }

    return { type: "success", detail };
  } catch {
    return { type: "network_error", message: NETWORK_MESSAGE };
  }
};
