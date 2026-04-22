import Fastify from "fastify";
import { healthResponseSchema } from "@memories/shared";

const logLevel =
  (process.env["LOG_LEVEL"] as
    | "trace"
    | "debug"
    | "info"
    | "warn"
    | "error"
    | "fatal"
    | "silent"
    | undefined) ?? "info";

export function buildApp() {
  const app = Fastify({
    logger: {
      level: logLevel,
    },
  });

  app.get("/health", async () => {
    const body = { status: "ok" as const, service: "memories-api" };
    return healthResponseSchema.parse(body);
  });

  return app;
}
