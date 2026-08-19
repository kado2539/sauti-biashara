export const API_URL = (() => {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
      return "http://127.0.0.1:8003";
    }
    return `http://${host}:8003`;
  }

  return "http://127.0.0.1:8003";
})();

export function formatNetworkError(error: unknown) {
  if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
    return `Cannot reach the API at ${API_URL}. Start the backend server and try again.`;
  }
  return error instanceof Error ? error.message : "Network error";
}

export async function parseResponse(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text || res.statusText };
  }
}

export function formatApiError(data: any, statusText: string) {
  if (!data) return statusText;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) return data.detail.map((item: any) => item.msg || JSON.stringify(item)).join(" ");
  if (data.detail) return JSON.stringify(data.detail);
  if (typeof data.error === "string") return data.error;
  return statusText;
}

function decodeJwtPayload(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const decoded = atob(padded);
    const json = decodeURIComponent(
      decoded
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getStoredToken() {
  return localStorage.getItem("sb_token");
}

export function clearStoredToken() {
  localStorage.removeItem("sb_token");
}

export function isTokenExpired(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 <= Date.now();
}
