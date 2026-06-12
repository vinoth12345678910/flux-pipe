import { Prisma } from "@prisma/client";
export declare const pipelineRepository: {
    findById(id: string): Promise<{
        id: string;
        name: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        config: Prisma.JsonValue;
    } | null>;
    findByOrg(orgId: string, skip?: number, take?: number): Promise<{
        pipelines: {
            id: string;
            name: string;
            orgId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            isActive: boolean;
            config: Prisma.JsonValue;
        }[];
        total: number;
    }>;
    create(data: Prisma.PipelineCreateInput): Promise<{
        id: string;
        name: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        config: Prisma.JsonValue;
    }>;
    update(id: string, data: Prisma.PipelineUpdateInput): Promise<{
        id: string;
        name: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        config: Prisma.JsonValue;
    }>;
    softDelete(id: string): Promise<{
        id: string;
        name: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        config: Prisma.JsonValue;
    }>;
    findActive(orgId: string): Promise<{
        id: string;
        name: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        config: Prisma.JsonValue;
    }[]>;
};
//# sourceMappingURL=pipeline.repository.d.ts.map