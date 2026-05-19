import type { ToolName, ToolRequest, ToolResult } from "@fleetmind/shared/contracts/ai.js";

export type ToolHandler<TInput extends Record<string, unknown> = Record<string, unknown>, TData = Record<string, unknown>> = (
  request: ToolRequest<TInput>
) => Promise<ToolResult<TData>>;

export class ToolRegistry {
  private readonly handlers = new Map<ToolName, ToolHandler>();

  public register<TInput extends Record<string, unknown> = Record<string, unknown>, TData = Record<string, unknown>>(
    toolName: ToolName,
    handler: ToolHandler<TInput, TData>
  ): void {
    if (this.handlers.has(toolName)) {
      throw new Error(`Tool ${toolName} is already registered.`);
    }
    this.handlers.set(toolName, handler as ToolHandler);
  }

  public has(toolName: ToolName): boolean {
    return this.handlers.has(toolName);
  }

  public list(): ToolName[] {
    return [...this.handlers.keys()];
  }

  public async execute<TInput extends Record<string, unknown> = Record<string, unknown>, TData = Record<string, unknown>>(
    request: ToolRequest<TInput>
  ): Promise<ToolResult<TData>> {
    const handler = this.handlers.get(request.toolName);
    if (!handler) {
      throw new Error(`Tool ${request.toolName} is not registered.`);
    }

    const result = await handler(request);
    if (result.toolName !== request.toolName) {
      throw new Error(`Tool response mismatch. Expected ${request.toolName}, got ${result.toolName}.`);
    }
    return result as ToolResult<TData>;
  }
}
