import type { NextFunction, Request, Response } from "express";

const DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** Allow browser calls from Vite (5173) to API (4000) in local development. */
export function devCorsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV !== "development") {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (typeof origin === "string" && DEV_ORIGIN.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, x-tenant-id, x-user-id, x-request-id"
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
}
