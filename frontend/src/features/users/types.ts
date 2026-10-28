// Staff accounts and what each role may do (SOW 18). Signing in, sessions
// and one's own profile are real (backend `users`, `auth`); managing other
// staff and roles is sample data until the backend has roles.
import type { MasterRecord } from "@/features/masters/record-master";

export type Permission = "view" | "create" | "edit" | "delete";

export interface Role {
  id: string;
  name: string;
  description: string;
  /** Module href → what this role may do there. */
  access: Record<string, Permission[]>;
  /** Owner: cannot be edited or removed. */
  locked?: boolean;
}

export interface StaffUser extends MasterRecord {
  displayName: string;
  email: string;
  phone?: string;
  roleId: string;
  status: "active" | "invited" | "disabled";
  lastSeen?: string;
}

export interface ActivityEntry {
  at: string;
  userId: string;
  action: string;
  record?: string;
}
