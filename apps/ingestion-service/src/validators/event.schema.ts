import { z } from "zod";

export const singleEventSchema = z.object({
  pipelineId: z.string().uuid(),
  payload: z.record(z.unknown()),
  idempotencyKey: z.string().max(128).optional(),
});

export const batchEventSchema = z.object({
  events: z.array(singleEventSchema).min(1).max(100),
});
