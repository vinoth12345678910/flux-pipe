import { pipelineRepository } from "@fluxpipe/database";
import { AppError } from "@fluxpipe/shared-utils";
import { parsePagination, buildPaginationMeta } from "@fluxpipe/shared-utils";

export const pipelineService = {
  async list(orgId: string, query: { page?: string; limit?: string }) {
    const params = parsePagination(query);
    const { pipelines, total } = await pipelineRepository.findByOrg(orgId, params.skip, params.limit);
    return { data: pipelines, meta: buildPaginationMeta(total, params) };
  },

  async getById(orgId: string, id: string) {
    const pipeline = await pipelineRepository.findById(id);
    if (!pipeline || pipeline.orgId !== orgId || !pipeline.isActive) throw new AppError(404, "NOT_FOUND", "Pipeline not found");
    return pipeline;
  },

  async create(orgId: string, data: { name: string; description?: string; config?: unknown }) {
    return pipelineRepository.create({
      name: data.name,
      description: data.description,
      config: (data.config ?? {}) as any,
      organization: { connect: { id: orgId } },
    });
  },

  async update(orgId: string, id: string, data: { name?: string; description?: string; isActive?: boolean; config?: unknown }) {
    const pipeline = await pipelineRepository.findById(id);
    if (!pipeline || pipeline.orgId !== orgId) throw new AppError(404, "NOT_FOUND", "Pipeline not found");
    return pipelineRepository.update(id, data as any);
  },

  async delete(orgId: string, id: string) {
    const pipeline = await pipelineRepository.findById(id);
    if (!pipeline || pipeline.orgId !== orgId) throw new AppError(404, "NOT_FOUND", "Pipeline not found");
    return pipelineRepository.softDelete(id);
  },
};
