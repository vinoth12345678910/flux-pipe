import { z } from "zod";

export const createDestinationSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["webhook", "s3", "kafka", "http"]),
  pipelineId: z.string().uuid(),
  config: z.record(z.unknown()),
  isActive: z.boolean().optional().default(true),
});

export const updateDestinationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(["webhook", "s3", "kafka", "http"]).optional(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});
