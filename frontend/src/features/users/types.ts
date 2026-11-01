// Staff accounts and what each role may do (SOW 18). Accounts and roles are
// real (backend `staff`, `access-roles`); the activity log is still sample
// data until the backend records activity.
import type { MasterRecord } from "@/features/masters/record-master";
import type { ModuleAction } from "@/types/staff";

export type Permission = ModuleAction;

/** The role id the Users page uses for administrators, who have no access role. */
export const ADMIN_ROLE_ID = "admin";

export interface Role {
  id: string;
  name: string;
  description: string;
  /** Module href → what this role may do there. */
  access: Record<string, Permission[]>;
  /** Administrator: everything, cannot be edited. */
  locked?: boolean;
  userCount?: number;
}

export type StaffStatus = "active" | "invited" | "disabled";

/** A staff member as the Users list and form see them. */
export interface StaffUser extends MasterRecord {
  fullName: string;
  displayName: string;
  email: string;
  phone?: string;
  /** An access role id, or ADMIN_ROLE_ID. */
  roleId: string;
  isActive: boolean;
  status: StaffStatus;
  isLocked: boolean;
  lastSeen?: string;
}

export interface ActivityEntry {
  at: string;
  who: string;
  action: string;
  record?: string;
}
