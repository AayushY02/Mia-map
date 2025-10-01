/**
 * Build a blob URL from a single base env and an optional SAS + query params.
 * - Works for public containers (no SAS)
 * - Works for container-level SAS (appends ?<sas>)
 * - Safe with trailing/leading slashes
 */
type Queryish = Record<string, string | number | boolean | undefined | null>;

const BASE = (import.meta.env.VITE_DATA_BASE_URL ?? "").replace(/\/+$/, "");
const SAS  = (import.meta.env.VITE_DATA_SAS ?? "").replace(/^\?/, ""); // keep empty if not set

if (!BASE) {
  // Fail fast in dev if misconfigured
  // eslint-disable-next-line no-console
  console.warn("[blobUrl] VITE_DATA_BASE_URL is not set. Falling back may break data loads.");
}

export function blobUrl(fileName: string, query?: Queryish): string {
  const cleanName = String(fileName || "").replace(/^\/+/, "");
  if (!cleanName) throw new Error("blobUrl(fileName) requires a non-empty filename");

  const extra = new URLSearchParams();
  // add optional query params (e.g., cache buster: { v: buildId })
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      extra.append(k, String(v));
    }
  }
  // Compose query string: SAS first (if present), then extra params
  const parts: string[] = [];
  if (SAS) parts.push(SAS);
  const extraStr = extra.toString();
  if (extraStr) parts.push(extraStr);

  const qs = parts.length ? `?${parts.join("&")}` : "";
  return `${BASE}/${cleanName}${qs}`;
}
