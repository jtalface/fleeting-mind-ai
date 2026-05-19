import { ApiError } from "./errors.js";

const DB_UNAVAILABLE_PATTERNS = [
  "Can't reach database server",
  "Connection refused",
  "ECONNREFUSED",
  "P1001"
] as const;

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const text = `${error.name} ${error.message}`;
  return DB_UNAVAILABLE_PATTERNS.some((pattern) => text.includes(pattern));
}

export function toDatabaseUnavailableError(error: unknown): ApiError {
  return new ApiError(
    503,
    "DATABASE_UNAVAILABLE",
    "PostgreSQL is not reachable. Start Docker Desktop, then run: pnpm dev:setup",
    error instanceof Error ? { cause: error.message } : undefined
  );
}
