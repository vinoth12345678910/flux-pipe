import { Role } from "./roles";

export enum Permission {
  CreatePipeline = "pipeline:create",
  EditPipeline = "pipeline:edit",
  DeletePipeline = "pipeline:delete",
  ViewPipeline = "pipeline:view",
  CreateDestination = "destination:create",
  EditDestination = "destination:edit",
  DeleteDestination = "destination:delete",
  ViewDestination = "destination:view",
  ViewEvents = "events:view",
  ReplayEvents = "events:replay",
  ViewDLQ = "dlq:view",
  ManageApiKeys = "apikeys:manage",
  ViewUsage = "usage:view",
  ManageOrg = "org:manage",
  ManageUsers = "users:manage",
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.Admin]: Object.values(Permission),
  [Role.Operator]: [
    Permission.CreatePipeline,
    Permission.EditPipeline,
    Permission.ViewPipeline,
    Permission.CreateDestination,
    Permission.EditDestination,
    Permission.ViewDestination,
    Permission.ViewEvents,
    Permission.ReplayEvents,
    Permission.ViewDLQ,
    Permission.ManageApiKeys,
    Permission.ViewUsage,
  ],
  [Role.Viewer]: [
    Permission.ViewPipeline,
    Permission.ViewDestination,
    Permission.ViewEvents,
    Permission.ViewDLQ,
    Permission.ViewUsage,
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
