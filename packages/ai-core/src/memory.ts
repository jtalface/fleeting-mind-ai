import type { TenantId, TimestampIso } from "@fleetmind/shared/contracts/domain.js";

export interface ConversationMemoryTurn {
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: TimestampIso;
}

export interface ConversationMemory {
  getRecent(tenantId: TenantId, conversationId: string, limit?: number): Promise<ConversationMemoryTurn[]>;
  append(tenantId: TenantId, conversationId: string, turn: ConversationMemoryTurn): Promise<void>;
  clear(tenantId: TenantId, conversationId: string): Promise<void>;
}

export class InMemoryConversationMemory implements ConversationMemory {
  private readonly sessions = new Map<string, ConversationMemoryTurn[]>();

  public async getRecent(tenantId: TenantId, conversationId: string, limit = 20): Promise<ConversationMemoryTurn[]> {
    const key = this.sessionKey(tenantId, conversationId);
    const turns = this.sessions.get(key) ?? [];
    return turns.slice(-limit);
  }

  public async append(tenantId: TenantId, conversationId: string, turn: ConversationMemoryTurn): Promise<void> {
    const key = this.sessionKey(tenantId, conversationId);
    const turns = this.sessions.get(key) ?? [];
    turns.push(turn);
    this.sessions.set(key, turns);
  }

  public async clear(tenantId: TenantId, conversationId: string): Promise<void> {
    this.sessions.delete(this.sessionKey(tenantId, conversationId));
  }

  private sessionKey(tenantId: TenantId, conversationId: string): string {
    return `${tenantId}:${conversationId}`;
  }
}
