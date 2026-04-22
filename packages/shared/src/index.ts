import { z } from "zod";

export const serviceName = "memories" as const;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
