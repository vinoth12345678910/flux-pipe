import { Prisma } from "@prisma/client";
export declare const eventRepository: {
    create(data: Prisma.EventCreateInput): Promise<{
        status: string;
        id: string;
        orgId: string;
        payload: Prisma.JsonValue;
        idempotencyKey: string | null;
        receivedAt: Date;
        processedAt: Date | null;
        deliveredAt: Date | null;
        pipelineId: string;
    }>;
    findById(id: string): Promise<{
        status: string;
        id: string;
        orgId: string;
        payload: Prisma.JsonValue;
        idempotencyKey: string | null;
        receivedAt: Date;
        processedAt: Date | null;
        deliveredAt: Date | null;
        pipelineId: string;
    } | null>;
    updateStatus(id: string, status: string): Promise<{
        status: string;
        id: string;
        orgId: string;
        payload: Prisma.JsonValue;
        idempotencyKey: string | null;
        receivedAt: Date;
        processedAt: Date | null;
        deliveredAt: Date | null;
        pipelineId: string;
    }>;
    findByOrg(orgId: string, filters: {
        status?: string;
        pipelineId?: string;
        from?: Date;
        to?: Date;
    }, skip?: number, take?: number): Promise<{
        events: {
            status: string;
            id: string;
            orgId: string;
            payload: Prisma.JsonValue;
            idempotencyKey: string | null;
            receivedAt: Date;
            processedAt: Date | null;
            deliveredAt: Date | null;
            pipelineId: string;
        }[];
        total: number;
    }>;
};
//# sourceMappingURL=event.repository.d.ts.map