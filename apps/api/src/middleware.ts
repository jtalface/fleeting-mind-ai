import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { ApiErrorEnvelope } from "../../../packages/shared/src/contracts/api.js";
import { isDatabaseUnavailableError, toDatabaseUnavailableError } from "./database-errors.js";
import { ApiError } from "./errors.js";
import type { RequestWithContext } from "./types.js";

const HEADER_TENANT_ID = "x-tenant-id";
const HEADER_USER_ID = "x-user-id";
const HEADER_REQUEST_ID = "x-request-id";

const randomRequestId = (): string => `req_${Math.random().toString(36).slice(2, 11)}`;

export function contextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const tenantId = req.header(HEADER_TENANT_ID);
  const userId = req.header(HEADER_USER_ID);

  if (!tenantId || !userId) {
    next(
      new ApiError(401, "AUTH_CONTEXT_MISSING", "Missing auth context headers.", {
        requiredHeaders: [HEADER_TENANT_ID, HEADER_USER_ID]
      })
    );
    return;
  }

  (req as RequestWithContext).context = {
    tenantId,
    userId,
    requestId: req.header(HEADER_REQUEST_ID) ?? randomRequestId()
  };
  next();
}

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, "NOT_FOUND", `Route ${req.method} ${req.path} not found.`));
}

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response<ApiErrorEnvelope>,
  _next: NextFunction
): void {
  const requestId = (req as Partial<RequestWithContext>).context?.requestId ?? randomRequestId();

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        requestId,
        ...(error.details !== undefined ? { details: error.details } : {})
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        requestId,
        details: error.flatten()
      }
    });
    return;
  }

  if (error instanceof Error) {
    if (error.message.includes("Flespi API 401")) {
      res.status(502).json({
        error: {
          code: "TELEMATICS_AUTH_FAILED",
          message:
            "Flespi rejected the access token. Set a valid FLESPI_TOKEN in fleet-intelligence-ai/.env and restart the API.",
          requestId
        }
      });
      return;
    }

    if (isDatabaseUnavailableError(error)) {
      const dbError = toDatabaseUnavailableError(error);
      res.status(dbError.statusCode).json({
        error: {
          code: dbError.code,
          message: dbError.message,
          requestId
        }
      });
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.error(`[api] ${requestId}`, error);
    }
    res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: process.env.NODE_ENV === "development" ? error.message : "Unexpected server error.",
        requestId
      }
    });
    return;
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error.",
      requestId
    }
  });
}
