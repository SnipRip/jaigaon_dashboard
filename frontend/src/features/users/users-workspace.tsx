"use client";

import { KeyRound } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { FormMessage } from "@/components/ui/form-message";
import { CardTitle, GlassCard } from "@/components/ui/glass-card";
import { GlassTable } from "@/components/ui/glass-table";
import { SampleDataNotice } from "@/components/ui/sample-data-notice";
import { StatusChip } from "@/components/ui/status-chip";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ViewTabs } from "@/components/ui/view-tabs";
import { useCurrentUser } from "@/features/auth/current-user-context";
import type { FieldSpec } from "@/features/masters/record-fields";
import { RecordMaster } from "@/features/masters/record-master";
import { PASSWORD_FIELD_PATTERN, PASSWORD_RULE } from "@/features/settings/password-schema";
import { apiGet } from "@/lib/api-client";
import { formatDateTime, formatQuantity } from "@/lib/format";
import type { AccessRoleView, StaffMember } from "@/types/staff";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { RolesMatrix } from "./roles-matrix";
import { ACCESS_ROLES_PATH, administratorRole, createStaff, STAFF_PATH, toRole, toStaffUser, updateStaff } from "./staff-api";
import { ADMIN_ROLE_ID, type ActivityEntry, type StaffUser } from "./types";

type Tab = "users" | "roles" | "activity";

const TABS: { value: Tab; label: string }[] = [
  { value: "users", label: "Staff" },
  { value: "roles", label: "Roles and permissions" },
  { value: "activity", label: "Activity" },
];

const STATUS = {
  active: { tone: "success", text: "Active" },
  invited: { tone: "brand", text: "New account" },
  disabled: { tone: "neutral", text: "Disabled" },
} as const;

const PASSWORD_FIELD: FieldSpec = {
  key: "temporaryPassword",
  label: "Temporary password",
  kind: "text",
  required: true,
  pattern: PASSWORD_FIELD_PATTERN,
  message: PASSWORD_RULE,
  maxLength: 128,
  hint: "Tell it to them. They choose their own at first sign-in.",
  wide: true,
};

interface UsersWorkspaceProps {
  activity: ActivityEntry[];
  modules: { href: string; label: string }[];
}

// Users & roles (SOW 18): staff accounts, what each role may do, and who did
// what. Each person signs in with their own account; nobody shares one.
// Accounts and roles are saved through the backend; administrators only.
export function UsersWorkspace({ activity, modules }: UsersWorkspaceProps) {
  const currentUser = useCurrentUser();
  const isAdmin = currentUser.role === "ADMIN";
  const [tab, setTab] = useState<Tab>("users");
  const [resetting, setResetting] = useState<StaffUser | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const staff = useSWR<StaffMember[]>(isAdmin ? STAFF_PATH : null, apiGet);
  const accessRoles = useSWR<AccessRoleView[]>(isAdmin ? ACCESS_ROLES_PATH : null, apiGet);
  // Stable between reloads: the list replaces its records when this changes.
  const users = useMemo(() => staff.data?.map(toStaffUser), [staff.data]);

  if (!isAdmin) {
    return <FormMessage tone="error">Only an administrator can manage users and roles. Your own profile and password are under Settings.</FormMessage>;
  }
  const loadError = staff.error ?? accessRoles.error;
  if (loadError) return <FormMessage tone="error">{loadError instanceof Error ? loadError.message : "Could not load users."}</FormMessage>;
  if (!users || !accessRoles.data) return <p className="text-[13px] font-medium text-muted">Loading users…</p>;

  const roles = [administratorRole(modules.map((module) => module.href)), ...accessRoles.data.map(toRole)];
  const roleName = (id: string) => roles.find((role) => role.id === id)?.name ?? "No role";
  const firstStaffRole = roles.find((role) => role.id !== ADMIN_ROLE_ID)?.id ?? ADMIN_ROLE_ID;

  return (
    <div className="flex flex-col gap-3.5">
      <ViewTabs label="Users views" tabs={TABS} value={tab} onChange={setTab} />

      {tab === "users" && (
        <>
          <RecordMaster<StaffUser>
            noun={["user", "staff"]}
            initialRecords={users}
            nameKey="displayName"
            blank={{ roleId: firstStaffRole, isActive: true }}
            fields={[
              { key: "fullName", label: "Full name", kind: "text", required: true, maxLength: 80 },
              { key: "displayName", label: "Short name", kind: "text", maxLength: 80, hint: "Shown in the app. The full name when left blank." },
              { key: "email", label: "Email (signs in with it)", kind: "text", required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" },
              { key: "phone", label: "Phone", kind: "text", pattern: /^\+[1-9]\d{7,14}$/, message: "With the country code, for example +919635312988" },
              { key: "roleId", label: "Role", kind: "select", required: true, wide: true, options: roles.map((role) => ({ value: role.id, label: `${role.name}: ${role.description}` })) },
              { key: "isActive", label: "Account", kind: "toggle", onLabel: "Can sign in", offLabel: "Disabled", hint: "Disabling signs them out everywhere." },
            ]}
            createOnlyFields={[PASSWORD_FIELD]}
            persist={{ create: createStaff, update: updateStaff }}
            rowActions={[
              { label: (user) => `Reset password for ${user.displayName}`, icon: <KeyRound aria-hidden="true" className="size-4" />, onClick: setResetting },
            ]}
            columns={[
              {
                label: "Name",
                render: (user) => (
                  <span className="inline-flex items-center gap-2.5">
                    <UserAvatar name={user.displayName} className="size-8 text-xs" />
                    {user.displayName}
                    {user.id === currentUser.id && <span className="text-xs font-medium text-muted">(you)</span>}
                  </span>
                ),
              },
              { label: "Email", render: (user) => <span className="text-ink-soft">{user.email}</span> },
              { label: "Role", render: (user) => roleName(user.roleId) },
              {
                label: "Status",
                render: (user) => (
                  <span className="inline-flex flex-wrap gap-1.5">
                    <StatusChip tone={STATUS[user.status].tone}>{STATUS[user.status].text}</StatusChip>
                    {user.isLocked && <StatusChip tone="danger">Locked after failed sign-ins</StatusChip>}
                  </span>
                ),
              },
              { label: "Last sign-in", render: (user) => (user.lastSeen ? formatDateTime(user.lastSeen) : "Never") },
            ]}
            searchText={(user) => `${user.fullName} ${user.displayName} ${user.email} ${roleName(user.roleId)}`}
            filters={[
              ...roles.map((role) => ({ label: role.name, test: (user: StaffUser) => user.roleId === role.id })),
              { label: "Disabled", test: (user: StaffUser) => !user.isActive },
            ]}
            stats={(records) => [
              { label: "Staff", value: formatQuantity(records.length) },
              { label: "Can sign in", value: formatQuantity(records.filter((user) => user.isActive).length) },
              { label: "Password not chosen yet", value: formatQuantity(records.filter((user) => user.status === "invited").length) },
              { label: "Roles", value: formatQuantity(roles.length) },
            ]}
            footnote="A new account signs in with the temporary password and must choose its own before using the app. Your own profile and password are under Settings."
          />
          {resetNotice && <FormMessage tone="success">{resetNotice}</FormMessage>}
          <ResetPasswordDialog
            user={resetting}
            onClose={() => setResetting(null)}
            onReset={async (user) => {
              setResetNotice(`${user.displayName}'s password was reset. They have been signed out and choose a new one at next sign-in.`);
              await staff.mutate();
            }}
          />
        </>
      )}

      {tab === "roles" && <RolesMatrix initialRoles={roles} modules={modules} onSaved={() => void accessRoles.mutate()} />}

      {tab === "activity" && (
        <GlassCard className="flex flex-col gap-3">
          <SampleDataNotice />
          <CardTitle>Activity</CardTitle>
          <GlassTable className="min-w-[620px]">
            <thead>
              <tr>
                <th scope="col" className="text-left">When</th>
                <th scope="col" className="text-left">Who</th>
                <th scope="col" className="text-left">What</th>
                <th scope="col" className="text-left">Record</th>
              </tr>
            </thead>
            <tbody className="font-semibold">
              {activity.map((entry, index) => (
                <tr key={index}>
                  <td>{formatDateTime(entry.at)}</td>
                  <td className="font-semibold">{entry.who}</td>
                  <td>{entry.action}</td>
                  <td>{entry.record ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </GlassTable>
          <p className="text-xs font-semibold text-muted">Every save, delete and sign-in is logged once the backend records activity.</p>
        </GlassCard>
      )}
    </div>
  );
}
