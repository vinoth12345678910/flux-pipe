import { Prisma } from "@prisma/client";
export declare const orgRepository: {
    findById(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        plan: string;
    } | null>;
    findBySlug(slug: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        plan: string;
    } | null>;
    create(data: Prisma.OrganizationCreateInput): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        plan: string;
    }>;
    updatePlan(id: string, plan: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        plan: string;
    }>;
};
//# sourceMappingURL=org.repository.d.ts.map