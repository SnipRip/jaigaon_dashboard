// Calls to the admin user-management routes, and the conversion between the
// backend's shapes and the ones the Users page works with.
import { apiRequest } from "@/lib/api-client";
import type { AccessRoleView, ModulePermissions, StaffMember } from "@/types/staff";
import { ADMIN_ROLE_ID, type Role, type StaffStatus, type StaffUser } from "./types";

export const STAFF_PATH = "/staff";
export const ACCESS_ROLES_PATH = "/access-roles";

const statusOf = (member: StaffMember): StaffStatus =>
  !member.isActive ? "disabled" : member.mustChangePassword ? "invited" : "active";

export const toStaffUser = (member: StaffMember): StaffUser => ({
  id: member.id,
  fullName: member.fullName,
  displayName: member.displayName,
  email: member.email,
  phone: member.phone ?? undefined,
  roleId: member.role === "ADMIN" ? ADMIN_ROLE_ID : (member.accessRoleId ?? ""),
  isActive: member.isActive,
  status: statusOf(member),
  isLocked: member.isLocked,
  lastSeen: member.lastSignInAt ?? undefined,
});

export const toRole = (role: AccessRoleView): Role => ({
  id: role.id,
  name: role.name,
  description: role.description,
  access: role.permissions,
  userCount: role.userCount,
});

/** Shown first in role pickers and the matrix; not stored as an access role. */
export const administratorRole = (modules: string[]): Role => ({
  id: ADMIN_ROLE_ID,
  name: "Administrator",
  description: "Everything, including users, roles and settings",
  access: Object.fromEntries(modules.map((href) => [href, ["view", "create", "edit", "delete"]])),
  locked: true,
});

// Form values (strings, blanks left out) → the body the backend expects.
function staffBody(changes: Record<string, unknown>) {
  const fullName = String(changes.fullName ?? "");
  const roleId = String(changes.roleId ?? "");
  const isAdmin = roleId === ADMIN_ROLE_ID;
  return {
    email: changes.email,
    fullName,
    displayName: changes.displayName ?? fullName,
    phone: changes.phone ?? null,
    role: isAdmin ? "ADMIN" : "STAFF",
    accessRoleId: isAdmin ? null : roleId,
    isActive: changes.isActive,
  };
}

export async function createStaff(changes: Record<string, unknown>): Promise<StaffUser> {
  const member = await apiRequest<StaffMember>(STAFF_PATH, {
    method: "POST",
    body: { ...staffBody(changes), temporaryPassword: changes.temporaryPassword },
  });
  return toStaffUser(member);
}

export async function updateStaff(user: StaffUser, changes: Record<string, unknown>): Promise<StaffUser> {
  const member = await apiRequest<StaffMember>(`${STAFF_PATH}/${user.id}`, {
    method: "PATCH",
    body: staffBody(changes),
  });
  return toStaffUser(member);
}

export async function resetStaffPassword(user: StaffUser, temporaryPassword: string): Promise<StaffUser> {
  const member = await apiRequest<StaffMember>(`${STAFF_PATH}/${user.id}/password`, {
    method: "POST",
    body: { temporaryPassword },
  });
  return toStaffUser(member);
}

export async function saveRolePermissions(role: Role, permissions: ModulePermissions): Promise<Role> {
  const saved = await apiRequest<AccessRoleView>(`${ACCESS_ROLES_PATH}/${role.id}`, {
    method: "PATCH",
    body: { permissions },
  });
  return toRole(saved);
}
