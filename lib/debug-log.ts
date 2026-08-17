import fs from "node:fs";
import path from "node:path";

const DEBUG_LOG_PATH = path.join(process.cwd(), "debug-4b89a7.log");
const DEBUG_INGEST_URL =
  "http://127.0.0.1:7845/ingest/a2d025f5-fe35-4ae1-99a7-a521e7490e24";
const DEBUG_SESSION_ID = "4b89a7";

export function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
  runId = "login-debug",
): void {
  const payload = {
    sessionId: DEBUG_SESSION_ID,
    runId,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  // #region agent log
  try {
    fs.appendFileSync(DEBUG_LOG_PATH, `${JSON.stringify(payload)}\n`);
  } catch {
    /* ignore */
  }
  fetch(DEBUG_INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION_ID,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}

export function debugErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
