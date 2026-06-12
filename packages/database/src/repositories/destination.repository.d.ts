import { Prisma } from "@prisma/client";
export declare const destinationRepository: {
    findById(id: string): Promise<{
        type: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        config: Prisma.JsonValue;
        pipelineId: string;
    } | null>;
    findByPipeline(pipelineId: string): Promise<{
        type: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        config: Prisma.JsonValue;
        pipelineId: string;
    }[]>;
    create(data: Prisma.DestinationCreateInput): Promise<{
        type: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        config: Prisma.JsonValue;
        pipelineId: string;
    }>;
    update(id: string, data: Prisma.DestinationUpdateInput): Promise<{
        type: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        config: Prisma.JsonValue;
        pipelineId: string;
    }>;
    delete(id: string): Promise<{
        type: string;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        config: Prisma.JsonValue;
        pipelineId: string;
    }>;
};
//# sourceMappingURL=destination.repository.d.ts.map