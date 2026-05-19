import type { Request } from "express";

export interface RequestContext {
  tenantId: string;
  userId: string;
  requestId: string;
}

export interface RequestWithContext extends Request {
  context: RequestContext;
}
