"use client";

import * as React from "react";

import { postPdfUpload } from "@/services/post-pdf-upload";
import type { PdfUploadState } from "@/types/pdf-upload";

import { validatePdf } from "./validate-pdf";

const clearFileInput = (input: HTMLInputElement | null) => {
  if (input) input.value = "";
};

export const usePdfUpload = () => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [state, setState] = React.useState<PdfUploadState>({ status: "idle" });

  const uploadFile = React.useCallback(async (file: File) => {
    const validationError = validatePdf(file);
    if (validationError) {
      setState({ status: "error", message: validationError });
      return;
    }

    setState({ status: "uploading", fileName: file.name });

    try {
      const result = await postPdfUpload(file);

      if (result.type === "network_error") {
        setState({ status: "error", message: result.message });
        return;
      }

      if (result.type === "http_error") {
        setState({
          status: "error",
          message:
            result.detail ??
            `Something went wrong (${result.status}). Please try again.`,
        });
        return;
      }

      setState({
        status: "success",
        fileName: file.name,
        detail:
          result.detail ?? "Your PDF was uploaded and processed successfully.",
      });
    } finally {
      clearFileInput(inputRef.current);
    }
  }, []);

  const openFilePicker = React.useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void uploadFile(file);
    },
    [uploadFile]
  );

  const onDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void uploadFile(file);
    },
    [uploadFile]
  );

  const onDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setDragActive(false);
  }, []);

  const busy = state.status === "uploading";

  return {
    state,
    dragActive,
    busy,
    inputRef,
    openFilePicker,
    uploadFile,
    onInputChange,
    dropHandlers: {
      onDrop,
      onDragOver,
      onDragEnter,
      onDragLeave,
    },
  };
};
