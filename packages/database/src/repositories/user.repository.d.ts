import { Prisma } from "@prisma/client";
export declare const userRepository: {
    findById(id: string): Promise<{
        id: string;
        email: string;
        passwordHash: string;
        name: string;
        role: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    findByEmail(email: string): Promise<{
        id: string;
        email: string;
        passwordHash: string;
        name: string;
        role: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    create(data: Prisma.UserCreateInput): Promise<{
        id: string;
        email: string;
        passwordHash: string;
        name: string;
        role: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateRole(id: string, role: string): Promise<{
        id: string;
        email: string;
        passwordHash: string;
        name: string;
        role: string;
        orgId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
};
//# sourceMappingURL=user.repository.d.ts.map