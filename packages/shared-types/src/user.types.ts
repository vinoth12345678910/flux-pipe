export enum Role {
  Admin = "admin",
  Operator = "operator",
  Viewer = "viewer",
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: Date;
  updatedAt: Date;
}
