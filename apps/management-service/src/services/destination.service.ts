import { destinationRepository, pipelineRepository } from "@fluxpipe/database";
import { AppError } from "@fluxpipe/shared-utils";
import { encryptAES, decryptAES } from "../utils/crypto";

export const destinationService = {
  async list(pipelineId: string) {
    return destinationRepository.findByPipeline(pipelineId);
  },

  async getById(orgId: string, id: string) {
    const dest = await destinationRepository.findById(id);
    if (!dest) throw new AppError(404, "NOT_FOUND", "Destination not found");
    const pipeline = await pipelineRepository.findById(dest.pipelineId);
    if (!pipeline || pipeline.orgId !== orgId) throw new AppError(404, "NOT_FOUND", "Destination not found");
    return dest;
  },

  async create(orgId: string, data: { name: string; type: string; pipelineId: string; config: Record<string, unknown>; isActive?: boolean }) {
    const pipeline = await pipelineRepository.findById(data.pipelineId);
    if (!pipeline || pipeline.orgId !== orgId) throw new AppError(404, "NOT_FOUND", "Pipeline not found");

    const config = { ...data.config };
    if (config.secret || config.apiKey || config.password) {
      const sensitiveFields = ["secret", "apiKey", "password", "token"];
      for (const field of sensitiveFields) {
        if (config[field]) {
          config[field] = encryptAES(String(config[field]));
        }
      }
    }

    return destinationRepository.create({
      name: data.name,
      type: data.type,
      config: config as any,
      isActive: data.isActive ?? true,
      pipeline: { connect: { id: data.pipelineId } },
    });
  },

  async update(orgId: string, id: string, data: { name?: string; type?: string; config?: Record<string, unknown>; isActive?: boolean }) {
    const dest = await destinationRepository.findById(id);
    if (!dest) throw new AppError(404, "NOT_FOUND", "Destination not found");
    const pipeline = await pipelineRepository.findById(dest.pipelineId);
    if (!pipeline || pipeline.orgId !== orgId) throw new AppError(404, "NOT_FOUND", "Destination not found");

    const updateData = { ...data };
    if (data.config) {
      const config = { ...data.config };
      const sensitiveFields = ["secret", "apiKey", "password", "token"];
      for (const field of sensitiveFields) {
        if (config[field]) {
          config[field] = encryptAES(String(config[field]));
        }
      }
      updateData.config = config as any;
    }

    return destinationRepository.update(id, updateData as any);
  },

  async delete(orgId: string, id: string) {
    const dest = await destinationRepository.findById(id);
    if (!dest) throw new AppError(404, "NOT_FOUND", "Destination not found");
    const pipeline = await pipelineRepository.findById(dest.pipelineId);
    if (!pipeline || pipeline.orgId !== orgId) throw new AppError(404, "NOT_FOUND", "Destination not found");
    return destinationRepository.delete(id);
  },
};
