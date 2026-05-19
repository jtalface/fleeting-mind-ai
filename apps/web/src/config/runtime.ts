import type { ApiClientConfig } from "../api/client.js";

function readEnv(key: string): string | undefined {
  const v = import.meta.env[key as keyof ImportMetaEnv];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export function getWebRuntimeConfig(): ApiClientConfig {
  return {
    baseUrl: readEnv("VITE_API_BASE_URL") ?? "",
    tenantId: readEnv("VITE_TENANT_ID") ?? "tenant_local",
    userId: readEnv("VITE_USER_ID") ?? "user_local",
    fetchImpl: fetch
  };
}
