// Load the canvas polyfills before PDF.js and make its native dependency
// visible to Next.js file tracing for serverless deployments.
import { getData } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

// Embed the worker so PDF.js does not rely on an untraced worker file.
PDFParse.setWorker(getData());

export { PDFParse };
