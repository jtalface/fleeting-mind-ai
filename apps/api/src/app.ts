import express from "express";
import { devCorsMiddleware } from "./cors.js";
import { errorMiddleware, contextMiddleware, notFoundMiddleware } from "./middleware.js";
import { buildRoutes } from "./routes.js";
import type { ApiRuntime } from "./runtime.js";

export interface CreateAppOptions {
  runtime?: ApiRuntime;
}

export function createApp(options: CreateAppOptions = {}): express.Express {
  const app = express();
  if (!options.runtime) {
    throw new Error("ApiRuntime is required. Use createApiRuntime() before createApp().");
  }
  const runtime = options.runtime;

  app.use(devCorsMiddleware);
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "api" });
  });
  app.use(contextMiddleware);
  app.use(buildRoutes(runtime));
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
