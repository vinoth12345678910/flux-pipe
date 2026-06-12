export interface TransformRule {
    action: "rename" | "drop" | "coerce";
    from?: string;
    to?: string;
    field?: string;
    type?: "string" | "number" | "boolean" | "date";
}
export interface PipelineConfig {
    transformations: TransformRule[];
    retryCount: number;
    retryDelayMs: number;
}
export interface Pipeline {
    id: string;
    name: string;
    description?: string;
    orgId: string;
    isActive: boolean;
    config: PipelineConfig;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=pipeline.types.d.ts.map