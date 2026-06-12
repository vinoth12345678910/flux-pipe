import { Prisma } from "@prisma/client";
export declare const deliveryRepository: {
    create(data: Prisma.DeliveryAttemptCreateInput): Promise<{
        status: string;
        id: string;
        attemptNumber: number;
        responseCode: number | null;
        latencyMs: number | null;
        errorMessage: string | null;
        attemptedAt: Date;
        eventId: string;
        destinationId: string;
    }>;
    findByEvent(eventId: string): Promise<{
        status: string;
        id: string;
        attemptNumber: number;
        responseCode: number | null;
        latencyMs: number | null;
        errorMessage: string | null;
        attemptedAt: Date;
        eventId: string;
        destinationId: string;
    }[]>;
    findByDestination(destinationId: string, skip?: number, take?: number): Promise<{
        attempts: {
            status: string;
            id: string;
            attemptNumber: number;
            responseCode: number | null;
            latencyMs: number | null;
            errorMessage: string | null;
            attemptedAt: Date;
            eventId: string;
            destinationId: string;
        }[];
        total: number;
    }>;
    countFailedByEvent(eventId: string): Promise<number>;
};
//# sourceMappingURL=delivery.repository.d.ts.map