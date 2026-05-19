import net from "node:net";
import { describe, expect, it } from "vitest";

const runDockerSmoke = process.env.RUN_DOCKER_SMOKE === "1";
const smokeIt = runDockerSmoke ? it : it.skip;

function canConnect(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const finalize = (result: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finalize(true));
    socket.once("timeout", () => finalize(false));
    socket.once("error", () => finalize(false));
    socket.connect(port, host);
  });
}

describe("docker local stack smoke checks", () => {
  smokeIt("connects to postgres on configured port", async () => {
    const host = process.env.SMOKE_POSTGRES_HOST ?? "127.0.0.1";
    const port = Number(process.env.SMOKE_POSTGRES_PORT ?? 5432);
    const reachable = await canConnect(host, port);
    expect(reachable).toBe(true);
  });

  smokeIt("connects to redis on configured port", async () => {
    const host = process.env.SMOKE_REDIS_HOST ?? "127.0.0.1";
    const port = Number(process.env.SMOKE_REDIS_PORT ?? 6379);
    const reachable = await canConnect(host, port);
    expect(reachable).toBe(true);
  });
});
