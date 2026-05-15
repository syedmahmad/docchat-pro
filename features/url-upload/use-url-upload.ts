"use client";

/**
 * State management hook for the URL ingestion flow.
 *
 * Manages:
 *   - The text the user is typing into the URL input
 *   - The current upload state (idle → submitting → success | error)
 *   - The submit handler that validates and POSTs the URL
 *
 * Mirrors usePdfUpload so both upload flows share the same conceptual shape.
 */

import * as React from "react";

import { postUrlUpload } from "@/services/post-url-upload";
import type { UrlUploadState } from "@/types/url-upload";
import { validateUrl } from "@/utils/validate-url";

export const useUrlUpload = () => {
  // The text currently in the URL input field — controlled by the parent form
  const [inputValue, setInputValue] = React.useState("");

  // Current phase of the upload state machine.
  // Starts as "idle" — nothing has happened yet.
  const [state, setState] = React.useState<UrlUploadState>({ status: "idle" });

  /**
   * Validate and submit the URL.
   *
   * Called when the user presses Enter or clicks the submit button.
   * Wrapped in useCallback so it keeps a stable identity across renders
   * and the form component doesn't re-render unnecessarily.
   */
  const submitUrl = React.useCallback(async (url: string) => {
    // Run the client-side URL validation before making a network request.
    // This gives the user instant feedback without a round trip to the server.
    const validationError = validateUrl(url);
    if (validationError) {
      // Show the validation error in the status banner immediately
      setState({ status: "error", message: validationError });
      return;
    }

    // Switch to "submitting" state — the UI shows a loading spinner
    setState({ status: "submitting", url });

    // POST the URL to the server-side ingestion pipeline
    const result = await postUrlUpload(url);

    // Handle the three possible outcomes returned by postUrlUpload
    if (result.type === "network_error") {
      // Device is offline or the server is unreachable
      setState({ status: "error", message: result.message });
      return;
    }

    if (result.type === "http_error") {
      // Server responded but with an error status (4xx, 5xx)
      setState({
        status: "error",
        // Prefer the server's error message because it describes the exact problem.
        // Fall back to a generic message if the server didn't include one.
        message:
          result.detail ??
          `Something went wrong (HTTP ${result.status}). Please try again.`,
      });
      return;
    }

    // Ingestion succeeded — update state and keep the URL for the success banner
    setState({
      status: "success",
      url,
      detail:
        result.detail ?? "The page was processed and saved successfully.",
    });

    // Clear the input after a successful submission so the user can add another URL
    setInputValue("");
  }, []);

  /**
   * Form submit handler — reads the current input value and calls submitUrl.
   *
   * We keep this separate from submitUrl so the component can attach it
   * directly to an onSubmit without destructuring inputValue itself.
   */
  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      // Prevent the browser's default form submission (page reload)
      e.preventDefault();
      void submitUrl(inputValue);
    },
    [inputValue, submitUrl],
  );

  // True while the server is processing — used to disable the input and button
  const busy = state.status === "submitting";

  return {
    inputValue,         // current value of the URL text input
    setInputValue,      // called on every keystroke in the input
    state,              // current phase of the state machine
    busy,               // whether to show the loading spinner
    handleSubmit,       // attached to the <form onSubmit>
  };
};
