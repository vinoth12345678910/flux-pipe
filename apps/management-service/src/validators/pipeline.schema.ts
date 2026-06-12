import { z } from "zod";

const transformRuleSchema = z.object({
  action: z.enum(["rename", "drop", "coerce"]),
  from: z.string().optional(),
  to: z.string().optional(),
  field: z.string().optional(),
  type: z.enum(["string", "number", "boolean", "date"]).optional(),
});

const pipelineConfigSchema = z.object({
  transformations: z.array(transformRuleSchema).default([]),
  retryCount: z.number().int().min(0).max(10).default(3),
  retryDelayMs: z.number().int().min(0).max(60000).default(1000),
});

export const createPipelineSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  config: pipelineConfigSchema.default({}),
});

export const updatePipelineSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
  config: pipelineConfigSchema.optional(),
});
