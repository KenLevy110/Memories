import Fastify from "fastify";
import { healthResponseSchema } from "@memories/shared";

export function buildApp() {
  const app = Fastify({
    logger: {
      level: "info",
    },
  });

  app.get("/health", async () => {
    const body = { status: "ok" as const, service: "memories-api" };
    return healthResponseSchema.parse(body);
  });

  return app;
}
