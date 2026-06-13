import { getClient } from "@fluxpipe/database";
import { TransformRule } from "@fluxpipe/shared-types";

export const processingService = {
  async updateEventStatus(eventId: string, status: string): Promise<void> {
    const updateData: Record<string, unknown> = { status };
    if (status === "delivered") updateData.deliveredAt = new Date();
    if (status === "processing") updateData.processedAt = new Date();
    await getClient().event.update({ where: { id: eventId }, data: updateData });
  },

  async getPipelineConfig(pipelineId: string): Promise<{ config: unknown; isActive: boolean } | null> {
    const pipeline = await getClient().pipeline.findUnique({
      where: { id: pipelineId },
      select: { config: true, isActive: true },
    });
    return pipeline;
  },

  applyTransformRules(payload: Record<string, unknown>, rules: TransformRule[]): Record<string, unknown> {
    let result = { ...payload };

    for (const rule of rules) {
      switch (rule.action) {
        case "rename": {
          if (rule.from !== undefined && rule.to !== undefined && rule.from in result) {
            result[rule.to] = result[rule.from];
            delete result[rule.from];
          }
          break;
        }
        case "drop": {
          if (rule.field !== undefined && rule.field in result) {
            delete result[rule.field];
          }
          break;
        }
        case "coerce": {
          if (rule.field !== undefined && rule.field in result) {
            const value = result[rule.field];
            switch (rule.type) {
              case "string":
                result[rule.field] = String(value);
                break;
              case "number": {
                const num = Number(value);
                result[rule.field] = isNaN(num) ? value : num;
                break;
              }
              case "boolean":
                result[rule.field] = value === "true" || value === true || value === 1;
                break;
              case "date":
                result[rule.field] = new Date(String(value)).toISOString();
                break;
            }
          }
          break;
        }
      }
    }

    return result;
  },
};

import { transformWorker } from "../workers/transform.worker";
import { enrichWorker } from "../workers/enrich.worker";
import { routeWorker } from "../workers/route.worker";

export async function startWorkers(): Promise<void> {
  // Referencing the worker imports to ensure they are initialized
  if (!transformWorker.isRunning()) await transformWorker.run();
  if (!enrichWorker.isRunning()) await enrichWorker.run();
  if (!routeWorker.isRunning()) await routeWorker.run();
}

export async function stopWorkers(): Promise<void> {
  await Promise.all([
    transformWorker.close(),
    enrichWorker.close(),
    routeWorker.close(),
  ]);
}
