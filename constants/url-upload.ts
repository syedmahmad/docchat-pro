/**
 * The API route that receives the URL and processes it into the vector store.
 * Keep this in sync with app/api/upload-url/route.ts.
 */
export const UPLOAD_URL_ENDPOINT = "/api/upload-url";

/**
 * Maximum number of characters we allow from a single web page.
 *
 * Very large pages (forums, wikis) can contain hundreds of thousands of characters.
 * Truncating at 200 000 keeps embedding costs reasonable while still capturing
 * the full content of most articles and documentation pages.
 */
export const MAX_URL_CONTENT_CHARS = 200_000;
