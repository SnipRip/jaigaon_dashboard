// Shapes the admin user-management routes return. Keep in step with
// backend/src/staff/staff-member.ts and backend/src/access-roles/access-roles.service.ts.
import type { Role } from "./user";

export type ModuleAction = "view" | "create" | "edit" | "delete";

/** Module href ("/items") → what the role may do there. */
export type ModulePermissions = Record<string, ModuleAction[]>;

export interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  displayName: string;
  phone: string | null;
  role: Role;
  accessRoleId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  isLocked: boolean;
  lastSignInAt: string | null;
  createdAt: string;
}

export interface AccessRoleView {
  id: string;
  name: string;
  description: string;
  permissions: ModulePermissions;
  userCount: number;
}
