export enum Role {
  Admin = "admin",
  Operator = "operator",
  Viewer = "viewer",
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.Admin]: 100,
  [Role.Operator]: 50,
  [Role.Viewer]: 10,
};

export function hasSufficientRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
