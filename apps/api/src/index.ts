import "./load-env.js";
import { createApp } from "./app.js";
import { createApiRuntime } from "./create-runtime.js";

const port = Number(process.env.API_PORT ?? 4000);

const runtime = await createApiRuntime();
const app = createApp({ runtime });

app.listen(port, () => {
  console.log(`API listening on port ${port} (storage: ${process.env.API_STORAGE ?? "prisma"})`);
});

const shutdown = async (signal: string) => {
  console.warn(`API received ${signal}, shutting down…`);
  await runtime.disconnect();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
